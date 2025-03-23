import { TokenType } from './TokenType';

// 错误处理时，我们需要告诉用户发生错误的位置。跟踪从 tokens 开始
// 我们只需要标记出现在哪一行，当然更复杂的实现需要包括 column 和 length

export class Token {
	readonly type: TokenType; // token 的类型
	readonly lexeme: string; // token 的文本
	readonly literal: any; // 表示 token 的 字面量值
	readonly line: number;

	constructor(type: TokenType, lexeme: string, literal: any, line: number) {
		this.type = type;
		this.lexeme = lexeme;
		this.literal = literal;
		this.line = line;
	}

	toString() {
		return this.type + ' ' + this.lexeme + ' ' + this.literal;
	}
}
