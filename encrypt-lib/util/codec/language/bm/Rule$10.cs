using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util.regex;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000049 RID: 73
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$10 : Object, Rule.RPattern
	{
		// Token: 0x060002A0 RID: 672 RVA: 0x0000F49C File Offset: 0x0000D69C
		[LineNumberTable(new byte[] { 161, 132, 111 })]
		[MethodImpl(8)]
		internal Rule$10(string A_1)
		{
			this.pattern = Pattern.compile(this.val$regex);
		}

		// Token: 0x060002A1 RID: 673 RVA: 0x0000F4CC File Offset: 0x0000D6CC
		[LineNumberTable(new byte[] { 159, 16, 170, 126 })]
		[MethodImpl(8)]
		public bool isMatch(CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			Pattern pattern = this.pattern;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			Matcher matcher = pattern.matcher(charSequence2);
			return matcher.find();
		}

		// Token: 0x04000107 RID: 263
		internal Pattern pattern;

		// Token: 0x04000108 RID: 264
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$regex = A_1;
	}
}
