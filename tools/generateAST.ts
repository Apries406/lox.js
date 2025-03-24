import * as fs from 'node:fs';
import * as path from 'node:path';
import Stream from 'node:stream';
const outputDir = process.argv[2];

if (!outputDir) {
	console.error('usage: node generateAST.ts <file>');
	process.exit(-1);
}
const indent = '  '; // 两个缩进

/**
 * 表达式 Expression
 */
defineAst(
	outputDir,
	'Expr',
	{
		Assign: 'Token name, Expr value--赋值表达式 Statement and State',
		Binary:
			'Expr left, Token operator, Expr right--二元表达式 Representing Code',
		Call: 'Expr callee, Token paren, Array<Expr> args--调用表达式 Functions',
		Comma:
			'Expr left, Token operator, Expr right--逗号分隔表达式 Representing Code',
		Conditional:
			'Expr condition, Expr thenBranch, Expr elseBranch--条件语句 Statement and State',
		Get: 'Expr obj, Token name--获取表达式 Classes',
		Grouping: 'Expr expression--分组表达式(括号) Representing Code',
		Literal: 'any value--文本值表达式 Representing Code',
		Logical:
			'Expr left, Token operator, Expr right--逻辑表达式(and & or) Control Flow',
		Set: 'Expr obj, Token name, Expr value--设置表达式(set) Classes',
		Super: 'Token keyword, Token method--super表达式(super) Classes',
		This: 'Token keyword--this表达式 Classes',
		Unary: 'Token operator, Expr right--一元表达式 Representing Code',
		Variable: 'Token name--变量表达式',
	},
	['import { Token } from "./Token";']
);

/**
 * 语句 Statement
 */

defineAst(
	outputDir,
	'Stmt',
	{
		Block: 'Array<Stmt> statements--块级语句 {}',
		Class: 'Token name, Variable superclass, Array<Function> methods--类语句',
		Expression: 'Expr expression--表达式语句',
		Function: 'Token name, Array<Token> params, Array<Stmt> body--Function语句',
		If: 'Expr condition, Stmt thenBranch, Stmt elseBranch--Control Flow - if...else',
		Let: 'Token name, Expr initializer--变量声明',
		Print: 'Expr expression--Print语句',
		Return: 'Token keyword, Expr value--返回语句',
		While: 'Expr condition, Stmt body--Control Flow - while',
	},
	[
		'import { Expr, Variable } from "./Expr";',
		'import { Token } from "./Token";',
	]
);

function defineAst(
	outputDir: string,
	name: string,
	types: {},
	imports: string[]
) {
	const outputPath = path.resolve(outputDir, name + '.ts');
	const writer = fs.createWriteStream(outputPath);

	writer.write(`/* Generated By ${path.basename(__filename)} */\n\n`);

	// 写一个token引入
	imports.map((item) => {
		writer.write(`${item}\n`);
	});

	writer.write('\n');

	// Visitor 类型
	writer.write(`export interface Visitor<T> {\n`);
	for (const type of Object.keys(types)) {
		writer.write(`${indent}visit${type}${name}(expr: ${type}): T; \n`);
	}
	writer.write(`}\n`);

	// baseClass generator

	writer.write(`export abstract class ${name} { \n`);

	writer.write(`${indent}abstract accept<T>(visitor: Visitor<T>): T;\n`);
	writer.write(`}\n\n`);

	// extends class generator
	const classNames = Object.keys(types);
	classNames.forEach((className) => {
		defineType(writer, name, className, types[className]);
		writer.write('\n');
	});

	writer.end();
}

function defineType(
	writer: Stream.Writable,
	parentName: string,
	typeName: string,
	fields: string
) {
	const [fieldsRaw, fieldComment] = fields.split('--');

	// 注释
	writer.write(`// ${fieldComment}\n`);
	writer.write(`export class ${typeName} extends ${parentName} { \n`);

	const fieldsArray = fieldsRaw.split(', ');
	const fieldList = fieldsArray.map((item) => item.split(' ')); // 获取到 [[类型, 名字], ...]
	const result = fieldList.map(([type, name]) => `${name}: ${type}`).join(', ');

	// 私有变量
	fieldList.map(([type, name]) => {
		writer.write(`${indent}${name}: ${type}\n`);
	});

	writer.write('\n');
	// 构造函数
	writer.write(`${indent}constructor(${result}) {\n`);
	writer.write(`${indent}${indent}super()\n`);
	fieldList.forEach(([_type, name]) => {
		writer.write(`${indent}${indent}this.${name} = ${name}\n`);
	});

	writer.write(`${indent}}\n\n`);

	writer.write(`${indent}accept<T>(visitor: Visitor<T>): T {\n`);
	writer.write(
		`${indent}${indent}return visitor.visit${typeName}${parentName}(this)\n`
	);
	writer.write(`${indent}}\n`);

	writer.write('}\n');
}
