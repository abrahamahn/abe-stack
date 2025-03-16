import { FuzzyMatch } from "../../../shared/fuzzyMatch"

interface FuzzyStringProps {
	match?: FuzzyMatch;
	text?: string;
}

export function FuzzyString({ match, text }: FuzzyStringProps) {
	if (!match) {
		return <span>{text}</span>;
	}

	return (
		<span>
			{match.map((item, i) => (
				<span
					key={i}
					style={{
						fontWeight: item.matched ? 'bold' : 'normal',
						color: item.matched ? '#3b82f6' : 'inherit',
					}}
				>
					{item.text}
				</span>
			))}
		</span>
	);
}
