using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200004C RID: 76
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$4 : Object, Rule.RPattern
	{
		// Token: 0x060002A8 RID: 680 RVA: 0x00010362 File Offset: 0x0000E562
		[LineNumberTable(430)]
		[MethodImpl(8)]
		internal Rule$4(string A_1)
		{
		}

		// Token: 0x060002A9 RID: 681 RVA: 0x00010374 File Offset: 0x0000E574
		[LineNumberTable(433)]
		[MethodImpl(8)]
		public bool isMatch(CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			object obj2 = this.val$content;
			return Object.instancehelper_equals(obj, obj2);
		}

		// Token: 0x0400010D RID: 269
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$content = A_1;
	}
}
