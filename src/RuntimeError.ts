import { Token } from './Token';

export class RuntimeError extends Error {
	token: Token;

	constructor(token: Token, message: string) {
		super(message);
		this.token = token;
	}
}

export class BreakError extends Error {
	constructor(public token: Token) {
		super('Break');
		this.name = 'BreakError';
	}
}

export class ContinueError extends Error {
	constructor(public token: Token) {
		super('Continue');
		this.name = 'ContinueError';
	}
}
