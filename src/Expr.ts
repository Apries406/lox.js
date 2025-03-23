/* Generated By generateAST.cjs */

import { Token } from './Token';
export abstract class Expr {
	accept(visitor) {}
}

export class Binary extends Expr {
	left: Expr;
	operator: Token;
	right: Expr;

	constructor(left: Expr, operator: Token, right: Expr) {
		super();
		this.left = left;
		this.operator = operator;
		this.right = right;
	}

	accept(visitor) {
		return visitor.visitBinaryExpr(this);
	}
}

export class Grouping extends Expr {
	expression: Expr;

	constructor(expression: Expr) {
		super();
		this.expression = expression;
	}

	accept(visitor) {
		return visitor.visitGroupingExpr(this);
	}
}

export class Literal extends Expr {
	value: object;

	constructor(value: object) {
		super();
		this.value = value;
	}

	accept(visitor) {
		return visitor.visitLiteralExpr(this);
	}
}

export class Unary extends Expr {
	operator: Token;
	right: Expr;

	constructor(operator: Token, right: Expr) {
		super();
		this.operator = operator;
		this.right = right;
	}

	accept(visitor) {
		return visitor.visitUnaryExpr(this);
	}
}
