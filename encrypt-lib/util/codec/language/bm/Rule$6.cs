using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200004E RID: 78
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$6 : Object, Rule.RPattern
	{
		// Token: 0x060002AC RID: 684 RVA: 0x000103F3 File Offset: 0x0000E5F3
		[LineNumberTable(450)]
		[MethodImpl(8)]
		internal Rule$6(string A_1)
		{
		}

		// Token: 0x060002AD RID: 685 RVA: 0x00010404 File Offset: 0x0000E604
		[LineNumberTable(453)]
		[MethodImpl(8)]
		public bool isMatch(CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			object obj2 = this.val$content;
			object obj3 = obj;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj3;
			CharSequence charSequence3 = charSequence2;
			obj3 = obj2;
			charSequence2.__<ref> = obj3;
			return Rule.access$200(charSequence3, charSequence2);
		}

		// Token: 0x0400010F RID: 271
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$content = A_1;
	}
}
