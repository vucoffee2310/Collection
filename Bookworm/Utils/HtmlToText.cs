using System;
using System.Collections.Generic;
using System.Text;
using System.Web;

namespace Bookworm.Utils
{
	// Token: 0x0200001D RID: 29
	public class HtmlToText
	{
		// Token: 0x060001C9 RID: 457 RVA: 0x00006E58 File Offset: 0x00005058
		static HtmlToText()
		{
			HtmlToText._tags.Add("address", "\n");
			HtmlToText._tags.Add("blockquote", "\n");
			HtmlToText._tags.Add("div", "\n");
			HtmlToText._tags.Add("dl", "\n");
			HtmlToText._tags.Add("fieldset", "\n");
			HtmlToText._tags.Add("form", "\n");
			HtmlToText._tags.Add("h1", "\n");
			HtmlToText._tags.Add("/h1", "\n");
			HtmlToText._tags.Add("h2", "\n");
			HtmlToText._tags.Add("/h2", "\n");
			HtmlToText._tags.Add("h3", "\n");
			HtmlToText._tags.Add("/h3", "\n");
			HtmlToText._tags.Add("h4", "\n");
			HtmlToText._tags.Add("/h4", "\n");
			HtmlToText._tags.Add("h5", "\n");
			HtmlToText._tags.Add("/h5", "\n");
			HtmlToText._tags.Add("h6", "\n");
			HtmlToText._tags.Add("/h6", "\n");
			HtmlToText._tags.Add("p", "\n");
			HtmlToText._tags.Add("/p", "\n");
			HtmlToText._tags.Add("table", "\n");
			HtmlToText._tags.Add("/table", "\n");
			HtmlToText._tags.Add("ul", "\n");
			HtmlToText._tags.Add("/ul", "\n");
			HtmlToText._tags.Add("ol", "\n");
			HtmlToText._tags.Add("/ol", "\n");
			HtmlToText._tags.Add("/li", "\n");
			HtmlToText._tags.Add("br", "\n");
			HtmlToText._tags.Add("/td", "\t");
			HtmlToText._tags.Add("/tr", "\n");
			HtmlToText._tags.Add("/pre", "\n");
			HtmlToText._ignoreTags = new HashSet<string>();
			HtmlToText._ignoreTags.Add("script");
			HtmlToText._ignoreTags.Add("noscript");
			HtmlToText._ignoreTags.Add("style");
			HtmlToText._ignoreTags.Add("object");
		}

		// Token: 0x060001CA RID: 458 RVA: 0x00007128 File Offset: 0x00005328
		public string Convert(string html)
		{
			this._text = new HtmlToText.TextBuilder();
			this._html = html;
			this._pos = 0;
			while (!this.EndOfText)
			{
				if (this.Peek() == '<')
				{
					bool flag;
					string text = this.ParseTag(out flag);
					if (text == "body")
					{
						this._text.Clear();
					}
					else if (text == "/body")
					{
						this._pos = this._html.Length;
					}
					else if (text == "pre")
					{
						this._text.Preformatted = true;
						this.EatWhitespaceToNextLine();
					}
					else if (text == "/pre")
					{
						this._text.Preformatted = false;
					}
					string text2;
					if (HtmlToText._tags.TryGetValue(text, out text2))
					{
						this._text.Write(text2);
					}
					if (HtmlToText._ignoreTags.Contains(text))
					{
						this.EatInnerContent(text);
					}
				}
				else if (char.IsWhiteSpace(this.Peek()))
				{
					this._text.Write(this._text.Preformatted ? this.Peek() : ' ');
					this.MoveAhead();
				}
				else
				{
					this._text.Write(this.Peek());
					this.MoveAhead();
				}
			}
			return HttpUtility.HtmlDecode(this._text.ToString());
		}

		// Token: 0x060001CB RID: 459 RVA: 0x00007278 File Offset: 0x00005478
		protected string ParseTag(out bool selfClosing)
		{
			string text = string.Empty;
			selfClosing = false;
			if (this.Peek() == '<')
			{
				this.MoveAhead();
				this.EatWhitespace();
				int pos = this._pos;
				if (this.Peek() == '/')
				{
					this.MoveAhead();
				}
				while (!this.EndOfText && !char.IsWhiteSpace(this.Peek()) && this.Peek() != '/' && this.Peek() != '>')
				{
					this.MoveAhead();
				}
				text = this._html.Substring(pos, this._pos - pos).ToLower();
				while (!this.EndOfText && this.Peek() != '>')
				{
					if (this.Peek() == '"' || this.Peek() == '\'')
					{
						this.EatQuotedValue();
					}
					else
					{
						if (this.Peek() == '/')
						{
							selfClosing = true;
						}
						this.MoveAhead();
					}
				}
				this.MoveAhead();
			}
			return text;
		}

		// Token: 0x060001CC RID: 460 RVA: 0x00007354 File Offset: 0x00005554
		protected void EatInnerContent(string tag)
		{
			string text = "/" + tag;
			while (!this.EndOfText)
			{
				if (this.Peek() == '<')
				{
					bool flag;
					if (this.ParseTag(out flag) == text)
					{
						return;
					}
					if (!flag && !tag.StartsWith("/"))
					{
						this.EatInnerContent(tag);
					}
				}
				else
				{
					this.MoveAhead();
				}
			}
		}

		// Token: 0x17000093 RID: 147
		// (get) Token: 0x060001CD RID: 461 RVA: 0x000073B1 File Offset: 0x000055B1
		protected bool EndOfText
		{
			get
			{
				return this._pos >= this._html.Length;
			}
		}

		// Token: 0x060001CE RID: 462 RVA: 0x000073C9 File Offset: 0x000055C9
		protected char Peek()
		{
			if (this._pos >= this._html.Length)
			{
				return '\0';
			}
			return this._html[this._pos];
		}

		// Token: 0x060001CF RID: 463 RVA: 0x000073F1 File Offset: 0x000055F1
		protected void MoveAhead()
		{
			this._pos = Math.Min(this._pos + 1, this._html.Length);
		}

		// Token: 0x060001D0 RID: 464 RVA: 0x00007411 File Offset: 0x00005611
		protected void EatWhitespace()
		{
			while (char.IsWhiteSpace(this.Peek()))
			{
				this.MoveAhead();
			}
		}

		// Token: 0x060001D1 RID: 465 RVA: 0x00007428 File Offset: 0x00005628
		protected void EatWhitespaceToNextLine()
		{
			while (char.IsWhiteSpace(this.Peek()))
			{
				int num = (int)this.Peek();
				this.MoveAhead();
				if (num == 10)
				{
					break;
				}
			}
		}

		// Token: 0x060001D2 RID: 466 RVA: 0x0000744C File Offset: 0x0000564C
		protected void EatQuotedValue()
		{
			char c = this.Peek();
			if (c == '"' || c == '\'')
			{
				this.MoveAhead();
				int pos = this._pos;
				this._pos = this._html.IndexOfAny(new char[] { c, '\r', '\n' }, this._pos);
				if (this._pos < 0)
				{
					this._pos = this._html.Length;
					return;
				}
				this.MoveAhead();
			}
		}

		// Token: 0x040000E1 RID: 225
		protected static Dictionary<string, string> _tags = new Dictionary<string, string>();

		// Token: 0x040000E2 RID: 226
		protected static HashSet<string> _ignoreTags;

		// Token: 0x040000E3 RID: 227
		protected HtmlToText.TextBuilder _text;

		// Token: 0x040000E4 RID: 228
		protected string _html;

		// Token: 0x040000E5 RID: 229
		protected int _pos;

		// Token: 0x0200005A RID: 90
		protected class TextBuilder
		{
			// Token: 0x060005B2 RID: 1458 RVA: 0x0001E941 File Offset: 0x0001CB41
			public TextBuilder()
			{
				this._text = new StringBuilder();
				this._currLine = new StringBuilder();
				this._emptyLines = 0;
				this._preformatted = false;
			}

			// Token: 0x17000105 RID: 261
			// (get) Token: 0x060005B3 RID: 1459 RVA: 0x0001E96D File Offset: 0x0001CB6D
			// (set) Token: 0x060005B4 RID: 1460 RVA: 0x0001E975 File Offset: 0x0001CB75
			public bool Preformatted
			{
				get
				{
					return this._preformatted;
				}
				set
				{
					if (value)
					{
						if (this._currLine.Length > 0)
						{
							this.FlushCurrLine();
						}
						this._emptyLines = 0;
					}
					this._preformatted = value;
				}
			}

			// Token: 0x060005B5 RID: 1461 RVA: 0x0001E99C File Offset: 0x0001CB9C
			public void Clear()
			{
				this._text.Length = 0;
				this._currLine.Length = 0;
				this._emptyLines = 0;
			}

			// Token: 0x060005B6 RID: 1462 RVA: 0x0001E9C0 File Offset: 0x0001CBC0
			public void Write(string s)
			{
				foreach (char c in s)
				{
					this.Write(c);
				}
			}

			// Token: 0x060005B7 RID: 1463 RVA: 0x0001E9F0 File Offset: 0x0001CBF0
			public void Write(char c)
			{
				if (this._preformatted)
				{
					this._text.Append(c);
					return;
				}
				if (c != '\r')
				{
					if (c == '\n')
					{
						this.FlushCurrLine();
						return;
					}
					if (char.IsWhiteSpace(c))
					{
						int length = this._currLine.Length;
						if (length == 0 || !char.IsWhiteSpace(this._currLine[length - 1]))
						{
							this._currLine.Append(' ');
							return;
						}
					}
					else
					{
						this._currLine.Append(c);
					}
				}
			}

			// Token: 0x060005B8 RID: 1464 RVA: 0x0001EA6C File Offset: 0x0001CC6C
			protected void FlushCurrLine()
			{
				string text = this._currLine.ToString().Trim();
				if (text.Replace("&nbsp;", string.Empty).Length == 0)
				{
					this._emptyLines++;
					if (this._emptyLines < 2 && this._text.Length > 0)
					{
						this._text.AppendLine(text);
					}
				}
				else
				{
					this._emptyLines = 0;
					this._text.AppendLine(text);
				}
				this._currLine.Length = 0;
			}

			// Token: 0x060005B9 RID: 1465 RVA: 0x0001EAF5 File Offset: 0x0001CCF5
			public override string ToString()
			{
				if (this._currLine.Length > 0)
				{
					this.FlushCurrLine();
				}
				return this._text.ToString();
			}

			// Token: 0x0400032F RID: 815
			private StringBuilder _text;

			// Token: 0x04000330 RID: 816
			private StringBuilder _currLine;

			// Token: 0x04000331 RID: 817
			private int _emptyLines;

			// Token: 0x04000332 RID: 818
			private bool _preformatted;
		}
	}
}
