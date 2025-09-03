using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000050 RID: 80
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$8 : Object, Rule.RPattern
	{
		// Token: 0x060002B0 RID: 688 RVA: 0x000104E0 File Offset: 0x0000E6E0
		[LineNumberTable(482)]
		[MethodImpl(8)]
		internal Rule$8(string A_1, bool A_2)
		{
		}

		// Token: 0x060002B1 RID: 689 RVA: 0x00010508 File Offset: 0x0000E708
		[LineNumberTable(485)]
		[MethodImpl(8)]
		public bool isMatch(CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			if (charSequence2.length() > 0)
			{
				object obj2 = this.val$bContent;
				object obj3 = _<ref>;
				int num = 0;
				obj = obj3;
				charSequence2.__<ref> = obj;
				char c = charSequence2.charAt(num);
				obj = obj2;
				charSequence2.__<ref> = obj;
				if (Rule.access$300(charSequence2, c) == this.val$shouldMatch)
				{
					return true;
				}
			}
			return false;
		}

		// Token: 0x04000112 RID: 274
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$bContent = A_1;

		// Token: 0x04000113 RID: 275
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal bool val$shouldMatch = A_2;
	}
}
