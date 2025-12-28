import { Container } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";

// Token repositories

// User repositories
import { MfaService } from "@/server/modules/core/auth/features/mfa/providers/mfa.service";

import { SessionService } from "../../../sessions/services/session.service";
import { UserRepository } from "../../../users/repositories/user.repository";

// Service providers
import { AuthService } from "../../features/core/providers/auth.service";
import { PasswordService } from "../../features/password/providers/password.service";

// Token services
import { TokenService } from "../../features/token/providers/token.service";

// Session service

// Verification service
import { VerificationService } from "../../services/verification.service";
import { PasswordResetTokenRepository } from "../../storage/repositories/password-reset.repository";
import { TokenRepository } from "../../storage/repositories/token.repository";
import { VerificationTokenRepository } from "../../storage/repositories/verification-token.repository";

// Controllers
import { AuthController } from "../controllers/auth.controller";

/**
 * Register all auth module services in the DI container
 */
export function registerAuthModule(container: Container): void {
  // Register repositories
  container.bind(TYPES.TokenRepository).to(TokenRepository).inSingletonScope();
  container
    .bind(TYPES.PasswordResetTokenRepository)
    .to(PasswordResetTokenRepository)
    .inSingletonScope();
  container
    .bind(TYPES.VerificationTokenRepository)
    .to(VerificationTokenRepository)
    .inSingletonScope();
  container.bind(TYPES.UserRepository).to(UserRepository).inSingletonScope();

  // Register services
  container.bind(TYPES.AuthService).to(AuthService).inSingletonScope();
  container.bind(TYPES.PasswordService).to(PasswordService).inSingletonScope();
  container.bind(TYPES.MfaService).to(MfaService).inSingletonScope();

  // Register session service
  container.bind(TYPES.SessionService).to(SessionService).inSingletonScope();

  // Register token services
  container.bind(TYPES.TokenService).to(TokenService).inSingletonScope();

  // Register verification service
  container
    .bind(TYPES.VerificationService)
    .to(VerificationService)
    .inSingletonScope();

  // Register controllers
  container.bind(TYPES.AuthController).to(AuthController).inSingletonScope();
}
