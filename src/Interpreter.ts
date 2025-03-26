import { error } from 'console';
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
import { BreakError, ContinueError, RuntimeError } from './RuntimeError';
import { Stmt, Visitor as StmtVisitor } from './Stmt';
import { Token } from './Token';
import { TokenType } from './TokenType';
import { LoxCallable } from './LoxCallable';
import { ClockFunction, LoxFunction } from './LoxFunction';

export type Value = object | null | boolean | string | number;

export class Interpreter implements ExprVisitor<Value>, StmtVisitor<void> {
	globals: Environment = new Environment();
	private environment = this.globals;

	constructor() {}

	interpret(statements: Array<Stmt.Stmt>) {
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
		console.log('触发visitCallExpr', expr);
		const callee = this.evaluate(expr.callee);
		const argumentArray: Array<Value> = [];

		for (const arg of expr.args) {
			argumentArray.push(this.evaluate(arg));
		}

		if (!(callee instanceof LoxCallable)) {
			throw new RuntimeError(expr.paren, 'Can only call functions and classes');
		}
		const func: LoxCallable = callee as LoxCallable;

		if (argumentArray.length !== func.arity()) {
			throw new RuntimeError(
				expr.paren,
				`Expected ${func.arity()} arguments but got ${argumentArray.length}.`
			);
		}

		return func.call(this, argumentArray);
	}

	visitCommaExpr(expr: Comma): Value {
		console.log('触发visitCommaExpr');
		throw new Error('Method not implemented.');
	}
	visitConditionalExpr(expr: Conditional): Value {
		console.log('触发visitConditionalExpr');
		throw new Error('Method not implemented.');
	}
	visitGetExpr(expr: Get): Value {
		console.log('触发visitGetExpr');

		throw new Error('Method not implemented.');
	}

	visitGroupingExpr(expr: Grouping): Value {
		return this.evaluate(expr.expression);
	}

	visitLiteralExpr(expr: Literal): Value {
		return expr.value;
	}

	visitLogicalExpr(expr: Logical): Value {
		const left = this.evaluate(expr.left);

		if (expr.operator.type === TokenType.OR) {
			if (this.isTruthy(left)) return left; // 逻辑短路， or情况，且左边为 true，则断在左边
		} else {
			if (!this.isTruthy(left)) return left; // and 情况，左边是 false，则断在左边
		}

		return this.evaluate(expr.right);
	}

	visitSetExpr(expr: Set): Value {
		console.log('触发visitSetExpr');

		throw new Error('Method not implemented.');
	}
	visitSuperExpr(expr: Super): Value {
		console.log('触发visitSetExpr');

		throw new Error('Method not implemented.');
	}
	visitThisExpr(expr: This): Value {
		console.log('触发visitSetExpr');

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

	execute(stmt: Stmt.Stmt): void {
		stmt.accept(this);
	}

	executeBlock(statements: Array<Stmt.Stmt>, environment: Environment) {
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
		if (typeof val === 'boolean') return Boolean(val);

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

	visitBlockStmt(stmt: Stmt.Block): void {
		this.executeBlock(stmt.statements, new Environment(this.environment));
	}
	visitClassStmt(stmt: Stmt.Class): void {
		console.log('触发visitClassStmt');

		throw new Error('Method not implemented.');
	}
	visitExpressionStmt(stmt: Stmt.Expression): void {
		this.evaluate(stmt.expression);
	}

	visitFunctionStmt(stmt: Stmt.Function): void {
		console.log('visitFunctionStmt');
		const func: LoxFunction = new LoxFunction(stmt);
		console.log('new func');
		this.environment.define(stmt.name.lexeme, func);
		console.log('define func');
	}

	visitIfStmt(stmt: Stmt.If): void {
		if (this.isTruthy(this.evaluate(stmt.condition))) {
			this.execute(stmt.thenBranch);
		} else if (stmt.elseBranch !== null) {
			this.execute(stmt.elseBranch);
		}
	}

	visitLetStmt(stmt: Stmt.Let): void {
		let value: Value = null;
		if (stmt.initializer !== null) {
			value = this.evaluate(stmt.initializer);
		}

		this.environment.define(stmt.name.lexeme, value);
	}

	visitPrintStmt(stmt: Stmt.Print): void {
		const value = this.evaluate(stmt.expression);
		console.log(value);
	}

	visitReturnStmt(stmt: Stmt.Return): void {
		console.log('触发visitReturnStmt');

		throw new Error('Method not implemented.');
	}

	visitWhileStmt(stmt: Stmt.While): void {
		while (this.isTruthy(this.evaluate(stmt.condition))) {
			try {
				this.execute(stmt.body);
			} catch (error) {
				if (error instanceof BreakError) {
					return;
				}

				if (error instanceof ContinueError) {
					continue;
				}
			}
		}
	}

	visitBreakStmt(stmt: Stmt.Break): void {
		throw new BreakError(stmt.keyword);
	}
	visitContinueStmt(stmt: Stmt.Continue): void {
		throw new ContinueError(stmt.keyword);
	}
}
