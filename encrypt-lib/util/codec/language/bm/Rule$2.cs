using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200004A RID: 74
	[InnerClass(null, Modifiers.Static)]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "parseRules", "(Ljava.util.Scanner;Ljava.lang.String;)Ljava.util.List;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$2 : Rule
	{
		// Token: 0x060002A2 RID: 674 RVA: 0x00010273 File Offset: 0x0000E473
		[MethodImpl(8)]
		public new static void __<clinit>()
		{
		}

		// Token: 0x060002A3 RID: 675 RVA: 0x00010278 File Offset: 0x0000E478
		[LineNumberTable(new byte[] { 161, 7, 125, 108 })]
		[MethodImpl(8)]
		internal Rule$2(string A_1, string A_2, string A_3, Rule.PhonemeExpr A_4, int A_5, string A_6)
			: base(A_1, A_2, A_3, A_4)
		{
			this.myLine = this.val$cLine;
			this.loc = this.val$location;
		}

		// Token: 0x060002A4 RID: 676 RVA: 0x000102BC File Offset: 0x0000E4BC
		[LineNumberTable(new byte[] { 161, 13, 102, 108, 119, 126, 105 })]
		[MethodImpl(8)]
		public override string toString()
		{
			StringBuilder stringBuilder = new StringBuilder();
			stringBuilder.append("Rule");
			stringBuilder.append("{line=").append(this.myLine);
			stringBuilder.append(", loc='").append(this.loc).append('\'');
			stringBuilder.append('}');
			return stringBuilder.toString();
		}

		// Token: 0x060002A5 RID: 677 RVA: 0x00010321 File Offset: 0x0000E521
		[HideFromJava]
		static Rule$2()
		{
			Rule.__<clinit>();
		}

		// Token: 0x04000109 RID: 265
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int myLine;

		// Token: 0x0400010A RID: 266
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private string loc;

		// Token: 0x0400010B RID: 267
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal int val$cLine = A_5;

		// Token: 0x0400010C RID: 268
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$location = A_6;
	}
}
