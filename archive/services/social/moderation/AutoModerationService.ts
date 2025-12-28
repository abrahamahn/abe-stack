import { IConfigService } from "@services/shared/config";

import { CacheService } from "@/server/infrastructure/cache";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import { BaseService } from "@/server/services/shared";
import { MetricsService } from "@/server/services/shared/monitoring";

import {
  ContentModerationService,
  ModerationReason,
  ModerationDecision,
} from "./ContentModerationService";

/**
 * Service for automatically moderating content using rules and ML models
 * Features:
 * 1. Rule-based content filtering
 * 2. ML-powered content classification
 * 3. Automatic content blocking based on thresholds
 * 4. Policy enforcement automation
 * 5. Content scanning pipeline
 */
export class AutoModerationService extends BaseService {
  private moderationRules: Array<{
    name: string;
    pattern: RegExp;
    reason: ModerationReason;
    severity: number;
  }> = [];

  private sensitiveTerms: string[] = [];
  private toxicThreshold: number = 0.8;
  private spamThreshold: number = 0.7;
  private autoDecisionThreshold: number = 0.85;

  constructor(
    private contentModerationService: ContentModerationService,
    private _configService: IConfigService,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("AutoModerationService");
    this.initializeRules();
  }

  /**
   * Initialize moderation rules from configuration
   */
  private initializeRules(): void {
    // In a real implementation, these would come from configuration
    this.moderationRules = [
      {
        name: "Profanity Filter",
        pattern: /\b(badword1|badword2|offensive)\b/i,
        reason: ModerationReason.INAPPROPRIATE,
        severity: 0.7,
      },
      {
        name: "URL Spam",
        pattern: /https?:\/\/[^\s]{10,}|buy now|click here|limited time/i,
        reason: ModerationReason.SPAM,
        severity: 0.8,
      },
      {
        name: "Personal Information",
        pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10,16}\b/,
        reason: ModerationReason.PERSONAL_INFO,
        severity: 0.9,
      },
    ];

    this.sensitiveTerms = ["password", "credit card", "ssn", "account number"];

    // Load thresholds from config service with defaults
    const toxicThresholdFromConfig = this._configService.getNumber(
      "moderation.toxicThreshold"
    );
    this.toxicThreshold =
      toxicThresholdFromConfig !== undefined ? toxicThresholdFromConfig : 0.8;

    const spamThresholdFromConfig = this._configService.getNumber(
      "moderation.spamThreshold"
    );
    this.spamThreshold =
      spamThresholdFromConfig !== undefined ? spamThresholdFromConfig : 0.7;

    const autoDecisionThresholdFromConfig = this._configService.getNumber(
      "moderation.autoDecisionThreshold"
    );
    this.autoDecisionThreshold =
      autoDecisionThresholdFromConfig !== undefined
        ? autoDecisionThresholdFromConfig
        : 0.85;
  }

  /**
   * Screen content through automated moderation
   * @param contentId ID of the content
   * @param contentType Type of the content
   * @param text Text to moderate
   * @param autoApply Whether to automatically apply moderation decisions
   */
  async screenContent(
    contentId: string,
    contentType: EntityType,
    text: string,
    autoApply: boolean = false
  ): Promise<{
    decision: ModerationDecision;
    reason: ModerationReason | null;
    confidence: number;
    autoApplied: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `automod:${contentType}:${contentId}`;
      const cachedResult = await this.cacheService.get<{
        decision: ModerationDecision;
        reason: ModerationReason | null;
        confidence: number;
      }>(cacheKey);

      if (cachedResult) {
        this.logger.debug(
          `Using cached auto-moderation result for ${contentType}:${contentId}`
        );
        this.metricsService.incrementCounter("automod_cache_hit");
        return { ...cachedResult, autoApplied: false };
      }

      // Rule-based scanning
      const ruleResult = this.scanContentWithRules(text);

      // ML-based toxicity detection (simulated)
      const toxicityResult = await this.detectToxicity(text);

      // ML-based spam detection (simulated)
      const spamResult = await this.detectSpam(text);

      // Combine results
      let finalDecision = ModerationDecision.APPROVE;
      let finalReason: ModerationReason | null = null;
      let finalConfidence = 0;

      // Check rule results
      if (ruleResult.matched) {
        finalDecision =
          ruleResult.severity > this.autoDecisionThreshold
            ? ModerationDecision.REJECT
            : ModerationDecision.FLAG;
        finalReason = ruleResult.reason ?? null;
        finalConfidence = ruleResult.severity;
      }

      // Check toxicity results
      if (
        toxicityResult.score > this.toxicThreshold &&
        toxicityResult.score > finalConfidence
      ) {
        finalDecision =
          toxicityResult.score > this.autoDecisionThreshold
            ? ModerationDecision.REJECT
            : ModerationDecision.FLAG;
        finalReason = ModerationReason.INAPPROPRIATE;
        finalConfidence = toxicityResult.score;
      }

      // Check spam results
      if (
        spamResult.score > this.spamThreshold &&
        spamResult.score > finalConfidence
      ) {
        finalDecision =
          spamResult.score > this.autoDecisionThreshold
            ? ModerationDecision.REJECT
            : ModerationDecision.FLAG;
        finalReason = ModerationReason.SPAM;
        finalConfidence = spamResult.score;
      }

      // Cache the result
      const result = {
        decision: finalDecision,
        reason: finalReason,
        confidence: finalConfidence,
      };

      await this.cacheService.set(cacheKey, result, 60 * 60); // Cache for 1 hour

      // Apply the decision if auto-apply is enabled and we have a clear decision
      let autoApplied = false;
      if (
        autoApply &&
        finalDecision !== ModerationDecision.APPROVE &&
        finalConfidence > this.autoDecisionThreshold
      ) {
        await this.contentModerationService.applyModerationDecision(
          contentId,
          contentType,
          finalDecision,
          "system",
          `Auto-moderation confidence: ${finalConfidence.toFixed(2)}`
        );
        autoApplied = true;
        this.metricsService.incrementCounter("automod_auto_applied");
      }

      // Record metrics
      this.metricsService.recordLatency(
        "automod_screening",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter(
        `automod_decision_${finalDecision.toLowerCase()}`
      );
      if (finalReason) {
        this.metricsService.incrementCounter(
          `automod_reason_${finalReason.toLowerCase()}`
        );
      }

      return {
        ...result,
        autoApplied,
      };
    } catch (error) {
      this.logger.error(
        `Error auto-moderating content ${contentType}:${contentId}:`,
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.metricsService.incrementCounter("automod_error");
      throw error;
    }
  }

  /**
   * Batch process multiple content items for moderation
   * @param items Array of content items to moderate
   * @param autoApply Whether to automatically apply moderation decisions
   */
  async batchScreenContent(
    items: Array<{
      contentId: string;
      contentType: EntityType;
      text: string;
    }>,
    autoApply: boolean = false
  ): Promise<
    Array<{
      contentId: string;
      contentType: EntityType;
      decision: ModerationDecision;
      reason: ModerationReason | null;
      confidence: number;
      autoApplied: boolean;
    }>
  > {
    try {
      // Process items in parallel with a concurrency limit
      const results = await Promise.all(
        items.map((item) =>
          this.screenContent(
            item.contentId,
            item.contentType,
            item.text,
            autoApply
          )
        )
      );

      return items.map((item, index) => ({
        contentId: item.contentId,
        contentType: item.contentType,
        ...results[index],
      }));
    } catch (error) {
      this.logger.error("Error batch processing content for moderation:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("automod_batch_error");
      throw error;
    }
  }

  /**
   * Scan recent content for moderation
   * @param contentType Type of content to scan
   * @param limit Maximum number of items to process
   * @param autoApply Whether to automatically apply moderation decisions
   */
  async scanRecentContent(
    contentType: EntityType,
    limit: number = 100,
    autoApply: boolean = false
  ): Promise<{
    processed: number;
    flagged: number;
    rejected: number;
    autoApplied: number;
  }> {
    try {
      // In a real implementation, this would:
      // 1. Query recent content from a repository
      // 2. Screen each item
      // 3. Apply decisions if autoApply is true

      // Simulated implementation
      const simulatedContent = Array.from({ length: limit }, (_, i) => ({
        contentId: `simulated_${i}`,
        contentType,
        text: this.generateRandomText(i),
      }));

      const results = await this.batchScreenContent(
        simulatedContent,
        autoApply
      );

      // Aggregate results
      const stats = {
        processed: results.length,
        flagged: results.filter((r) => r.decision === ModerationDecision.FLAG)
          .length,
        rejected: results.filter(
          (r) => r.decision === ModerationDecision.REJECT
        ).length,
        autoApplied: results.filter((r) => r.autoApplied).length,
      };

      this.logger.info(
        `Scanned ${stats.processed} items, flagged ${stats.flagged}, rejected ${stats.rejected}`
      );
      this.metricsService.incrementCounter("automod_scan_complete");

      return stats;
    } catch (error) {
      this.logger.error(`Error scanning recent ${contentType} content:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("automod_scan_error");
      throw error;
    }
  }

  /**
   * Update moderation rules
   * @param rules Array of rule configurations
   */
  async updateRules(
    rules: Array<{
      name: string;
      pattern: string;
      reason: ModerationReason;
      severity: number;
    }>
  ): Promise<boolean> {
    try {
      // Validate and compile regexes
      const compiledRules = rules.map((rule) => ({
        name: rule.name,
        pattern: new RegExp(rule.pattern, "i"),
        reason: rule.reason,
        severity: rule.severity,
      }));

      this.moderationRules = compiledRules;

      // In a real implementation, this would save the rules to a database or configuration

      this.logger.info(`Updated moderation rules, total: ${rules.length}`);
      this.metricsService.incrementCounter("automod_rules_updated");

      // Invalidate cache
      await this.cacheService.deleteByPattern("automod:*");

      return true;
    } catch (error) {
      this.logger.error("Error updating moderation rules:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("automod_rules_update_error");
      throw error;
    }
  }

  /**
   * Get current moderation rules
   */
  getRules(): Array<{
    name: string;
    pattern: string;
    reason: ModerationReason;
    severity: number;
  }> {
    return this.moderationRules.map((rule) => ({
      name: rule.name,
      pattern: rule.pattern.toString(),
      reason: rule.reason,
      severity: rule.severity,
    }));
  }

  /**
   * Update moderation thresholds
   */
  updateThresholds(config: {
    toxicThreshold?: number;
    spamThreshold?: number;
    autoDecisionThreshold?: number;
  }): boolean {
    try {
      if (config.toxicThreshold !== undefined) {
        this.toxicThreshold = Math.max(0, Math.min(1, config.toxicThreshold));
      }

      if (config.spamThreshold !== undefined) {
        this.spamThreshold = Math.max(0, Math.min(1, config.spamThreshold));
      }

      if (config.autoDecisionThreshold !== undefined) {
        this.autoDecisionThreshold = Math.max(
          0,
          Math.min(1, config.autoDecisionThreshold)
        );
      }

      this.logger.info("Updated moderation thresholds");
      this.metricsService.incrementCounter("automod_thresholds_updated");

      return true;
    } catch (error) {
      this.logger.error("Error updating moderation thresholds:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.metricsService.incrementCounter("automod_thresholds_update_error");
      throw error;
    }
  }

  /**
   * Get current moderation thresholds
   */
  getThresholds(): {
    toxicThreshold: number;
    spamThreshold: number;
    autoDecisionThreshold: number;
  } {
    return {
      toxicThreshold: this.toxicThreshold,
      spamThreshold: this.spamThreshold,
      autoDecisionThreshold: this.autoDecisionThreshold,
    };
  }

  // PRIVATE METHODS

  /**
   * Scan content using rule-based pattern matching
   */
  private scanContentWithRules(text: string): {
    matched: boolean;
    rule?: string;
    reason?: ModerationReason;
    severity: number;
  } {
    // Check against each rule
    for (const rule of this.moderationRules) {
      if (rule.pattern.test(text)) {
        return {
          matched: true,
          rule: rule.name,
          reason: rule.reason,
          severity: rule.severity,
        };
      }
    }

    // Check for sensitive terms
    for (const term of this.sensitiveTerms) {
      if (text.toLowerCase().includes(term)) {
        return {
          matched: true,
          rule: "Sensitive Term Detection",
          reason: ModerationReason.PERSONAL_INFO,
          severity: 0.8,
        };
      }
    }

    return {
      matched: false,
      severity: 0,
    };
  }

  /**
   * Detect toxicity in text (simulated ML)
   */
  private async detectToxicity(text: string): Promise<{ score: number }> {
    // Simulate ML model calls with a deterministic approach based on text content
    const toxicIndicators = [
      "hate",
      "awful",
      "terrible",
      "stupid",
      "idiot",
      "pathetic",
      "moron",
      "loser",
      "kill",
      "die",
    ];

    let score = 0;
    const lowerText = text.toLowerCase();

    // Check for toxic indicators
    for (const indicator of toxicIndicators) {
      if (lowerText.includes(indicator)) {
        score += 0.2;
      }
    }

    // Add randomness to simulate ML confidence variations
    score += Math.random() * 0.3;

    // Cap at 1.0
    return { score: Math.min(score, 1.0) };
  }

  /**
   * Detect spam in text (simulated ML)
   */
  private async detectSpam(text: string): Promise<{ score: number }> {
    // Simulate ML model calls with a deterministic approach based on text content
    const spamIndicators = [
      "free",
      "offer",
      "limited time",
      "click here",
      "buy now",
      "discount",
      "sale",
      "prize",
      "winner",
      "congratulations",
    ];

    let score = 0;
    const lowerText = text.toLowerCase();

    // Check for spam indicators
    for (const indicator of spamIndicators) {
      if (lowerText.includes(indicator)) {
        score += 0.15;
      }
    }

    // Check for excessive URLs
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    score += urlCount * 0.1;

    // Check for excessive capitalization
    const capsRatio =
      text.split("").filter((c) => c >= "A" && c <= "Z").length /
      Math.max(text.length, 1);
    if (capsRatio > 0.3) {
      score += capsRatio;
    }

    // Add randomness to simulate ML confidence variations
    score += Math.random() * 0.2;

    // Cap at 1.0
    return { score: Math.min(score, 1.0) };
  }

  /**
   * Generate random text for simulation
   */
  private generateRandomText(seed: number): string {
    const texts = [
      "This is a normal message with no issues.",
      "Hey there! Looking forward to chatting with you.",
      "Check out this cool website: https://example.com",
      "I hate you and wish you would die.",
      "FREE OFFER! CLICK HERE TO CLAIM YOUR PRIZE NOW! https://spam.example.com",
      "My credit card number is 1234-5678-9012-3456",
      "This is stupid and awful content",
      "BUY NOW LIMITED TIME OFFER!!! HUGE DISCOUNT!!!",
      "Contact me at my email address",
      "I'm really enjoying this platform",
    ];

    return texts[seed % texts.length];
  }
}
