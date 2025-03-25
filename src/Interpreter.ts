import { Environment } from './Environment';
import {
	Assign,
	Binary,
	Call,
	Comma,
	Conditional,
	Get,
	Grouping,
	Literal,
	Logical,
	Super,
	This,
	Visitor as ExprVisitor,
	Set,
	Unary,
	Variable,
	Expr,
} from './Expr';
import { Lox } from './Lox';
import { RuntimeError } from './RuntimeError';
import {
	Block,
	Class,
	Expression,
	Function,
	If,
	Let,
	Print,
	Return,
	Stmt,
	Visitor as StmtVisitor,
	While,
} from './Stmt';
import { Token } from './Token';
import { TokenType } from './TokenType';

export type Value = object | null | boolean | string | number;

export class Interpreter implements ExprVisitor<Value>, StmtVisitor<void> {
	private environment = new Environment();

	interpret(statements: Array<Stmt>) {
		try {
			for (const statement of statements) {
				this.execute(statement);
			}
		} catch (error) {
			Lox.runtimeError(error);
		}
	}

	visitAssignExpr(expr: Assign): Value {
		const value = this.evaluate(expr.value);

		this.environment.assign(expr.name, value);

		return value;
	}

	visitBinaryExpr(expr: Binary): Value {
		const left = this.evaluate(expr.left);
		const right = this.evaluate(expr.right);

		if (
			[
				TokenType.GREATER,
				TokenType.GREATER_EQUAL,
				TokenType.LESS,
				TokenType.LESS_EQUAL,
			].includes(expr.operator.type)
		) {
			// 不同类型不允许比较
			this.checkOperandsSameType(expr.operator, left, right);
		}

		switch (expr.operator.type) {
			case TokenType.GREATER:
			case TokenType.GREATER_EQUAL:
			case TokenType.LESS:
			case TokenType.LESS_EQUAL:
				if (typeof left === 'number') {
					this.checkNumberOperands(expr.operator, left, right);
					return this.compareNumbers(expr.operator, left, right as number);
				} else if (typeof left === 'string') {
					return this.compareStrings(expr.operator, left, right as string);
				}
				throw new RuntimeError(
					expr.operator,
					'Comparison operators are only supported for numbers and strings.'
				);
			case TokenType.MINUS:
				this.checkNumberOperands(expr.operator, left, right);
				return Number(left) - Number(right);
			case TokenType.PLUS:
				if (typeof left === 'number' && typeof right === 'number') {
					// 数字
					return Number(left) + Number(right);
				}
				if (typeof left === 'string' || typeof right === 'string') {
					return String(left) + String(right);
				}
				throw new RuntimeError(
					expr.operator,
					'Operands must be two numbers or two strings.'
				);
			case TokenType.SLASH:
				this.checkNumberOperands(expr.operator, left, right);
				if (right === 0) {
					throw new RuntimeError(
						expr.operator,
						'Division by zero is not allowed.'
					);
				}
				return Number(left) / Number(right);
			case TokenType.STAR:
				this.checkNumberOperands(expr.operator, left, right);
				return Number(left) * Number(right);
			case TokenType.BANG_EQUAL:
				return !this.isEqual(left, right);
			case TokenType.EQUAL_EQUAL:
				return this.isEqual(left, right);
		}

		// Unreachable
		return null;
	}
	visitCallExpr(expr: Call): Value {
		throw new Error('Method not implemented.');
	}
	visitCommaExpr(expr: Comma): Value {
		throw new Error('Method not implemented.');
	}
	visitConditionalExpr(expr: Conditional): Value {
		throw new Error('Method not implemented.');
	}
	visitGetExpr(expr: Get): Value {
		throw new Error('Method not implemented.');
	}

	visitGroupingExpr(expr: Grouping): Value {
		return this.evaluate(expr.expression);
		throw new Error('Method not implemented.');
	}

	visitLiteralExpr(expr: Literal): Value {
		return expr.value;
	}

	visitLogicalExpr(expr: Logical): Value {
		throw new Error('Method not implemented.');
	}
	visitSetExpr(expr: Set): Value {
		throw new Error('Method not implemented.');
	}
	visitSuperExpr(expr: Super): Value {
		throw new Error('Method not implemented.');
	}
	visitThisExpr(expr: This): Value {
		throw new Error('Method not implemented.');
	}

	visitUnaryExpr(expr: Unary): Value {
		const right = this.evaluate(expr.right);

		switch (expr.operator.type) {
			case TokenType.BANG:
				return !this.isTruthy(right) as boolean;
			case TokenType.MINUS:
				this.checkNumberOperand(expr.operator, right);
				return -(right as number);
		}

		return null;
	}

	visitVariableExpr(expr: Variable): Value {
		return this.environment.get(expr.name);
	}

	evaluate(expr: Expr): Value {
		return expr.accept<Value>(this as unknown as ExprVisitor<Value>);
	}

	execute(stmt: Stmt): void {
		stmt.accept(this);
	}

	executeBlock(statements: Array<Stmt>, environment: Environment) {
		const previous = this.environment;
		try {
			this.environment = environment;

			for (const statement of statements) {
				this.execute(statement);
			}
		} finally {
			this.environment = previous;
		}
	}
	isTruthy(val: Value): boolean {
		// false 和 nil 为 false
		if (val === null) return false;
		if (val instanceof Boolean) return !!val as boolean;

		return true;
	}

	isEqual(x: Value, y: Value): boolean {
		if (x === null && x === null) return true;
		if (x === null) return false;

		return x === y;
	}

	checkNumberOperand(token: Token, operand: Value) {
		if (typeof operand === 'number') return;
		throw new RuntimeError(token, 'Operand must be a number.');
	}

	checkNumberOperands(token: Token, left: Value, right: Value) {
		if (typeof left === 'number' && typeof right === 'number') return;
		throw new RuntimeError(token, 'operands must be numbers.');
	}

	checkOperandsSameType(token: Token, left: Value, right: Value) {
		if (typeof left !== typeof right) {
			throw new RuntimeError(
				token,
				'Operands must be of the same type for comparison.'
			);
		}
	}

	compareNumbers(operator: Token, left: number, right: number): boolean {
		switch (operator.type) {
			case TokenType.GREATER:
				return left > right;
			case TokenType.GREATER_EQUAL:
				return left >= right;
			case TokenType.LESS:
				return left < right;
			case TokenType.LESS_EQUAL:
				return left <= right;
			default:
				throw new RuntimeError(
					operator,
					`Unknown operator type: ${operator.type}`
				);
		}
	}

	compareStrings(operator: Token, left: string, right: string): boolean {
		const leftSum = this.calculateAsciiSum(left);
		const rightSum = this.calculateAsciiSum(right);
		switch (operator.type) {
			case TokenType.GREATER:
				return leftSum > rightSum;
			case TokenType.GREATER_EQUAL:
				return leftSum >= rightSum;
			case TokenType.LESS:
				return leftSum < rightSum;
			case TokenType.LESS_EQUAL:
				return leftSum <= rightSum;
			default:
				throw new RuntimeError(
					operator,
					`Unknown operator type: ${operator.type}`
				);
		}
	}

	calculateAsciiSum(str: string): number {
		let sum = 0;
		for (let i = 0; i < str.length; i++) {
			sum += str.charCodeAt(i);
		}

		return sum;
	}

	visitBlockStmt(stmt: Block): void {
		this.executeBlock(stmt.statements, new Environment(this.environment));
	}
	visitClassStmt(stmt: Class): void {
		throw new Error('Method not implemented.');
	}
	visitExpressionStmt(stmt: Expression): void {
		this.evaluate(stmt.expression);
	}
	visitFunctionStmt(stmt: Function): void {
		throw new Error('Method not implemented.');
	}
	visitIfStmt(stmt: If): void {
		throw new Error('Method not implemented.');
	}
	visitLetStmt(stmt: Let): void {
		let value: Value = null;
		if (stmt.initializer !== null) {
			value = this.evaluate(stmt.initializer);
		}

		this.environment.define(stmt.name.lexeme, value);
	}

	visitPrintStmt(stmt: Print): void {
		const value = this.evaluate(stmt.expression);
		console.log(value);
	}

	visitReturnStmt(stmt: Return): void {
		throw new Error('Method not implemented.');
	}
	visitWhileStmt(stmt: While): void {
		throw new Error('Method not implemented.');
	}
}
