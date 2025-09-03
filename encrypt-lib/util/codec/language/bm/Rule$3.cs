using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200004B RID: 75
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$3 : Object, Rule.RPattern
	{
		// Token: 0x060002A6 RID: 678 RVA: 0x00010328 File Offset: 0x0000E528
		[LineNumberTable(423)]
		[MethodImpl(8)]
		internal Rule$3()
		{
		}

		// Token: 0x060002A7 RID: 679 RVA: 0x00010334 File Offset: 0x0000E534
		[LineNumberTable(426)]
		[MethodImpl(8)]
		public bool isMatch(CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			return charSequence2.length() == 0;
		}
	}
}
