import React from "react"
import Button, { NakedButton, PrimaryButton } from "../Button"

export function ButtonDemo() {
	return (
		<div>
			<div style={{ marginBottom: 8 }}>
				<Button>Default Button</Button>
			</div>
			<div style={{ marginBottom: 8 }}>
				<PrimaryButton>Primary Button</PrimaryButton>
			</div>
			<div style={{ marginBottom: 8 }}>
				<NakedButton>Naked Button</NakedButton>
			</div>
		</div>
	)
}
