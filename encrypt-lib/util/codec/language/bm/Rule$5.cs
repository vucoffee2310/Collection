using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200004D RID: 77
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$5 : Object, Rule.RPattern
	{
		// Token: 0x060002AA RID: 682 RVA: 0x0001039B File Offset: 0x0000E59B
		[LineNumberTable(442)]
		[MethodImpl(8)]
		internal Rule$5(string A_1)
		{
		}

		// Token: 0x060002AB RID: 683 RVA: 0x000103AC File Offset: 0x0000E5AC
		[LineNumberTable(445)]
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
			return Rule.access$100(charSequence3, charSequence2);
		}

		// Token: 0x0400010E RID: 270
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$content = A_1;
	}
}
