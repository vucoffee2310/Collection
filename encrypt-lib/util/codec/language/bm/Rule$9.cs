using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000051 RID: 81
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", "pattern", "(Ljava.lang.String;)Lcom.edc.classbook.util.codec.language.bm.Rule$RPattern;")]
	[SourceFile("Rule.java")]
	internal sealed class Rule$9 : Object, Rule.RPattern
	{
		// Token: 0x060002B2 RID: 690 RVA: 0x00010574 File Offset: 0x0000E774
		[LineNumberTable(490)]
		[MethodImpl(8)]
		internal Rule$9(string A_1, bool A_2)
		{
		}

		// Token: 0x060002B3 RID: 691 RVA: 0x0001059C File Offset: 0x0000E79C
		[LineNumberTable(493)]
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
				obj = _<ref>;
				charSequence2.__<ref> = obj;
				int num = charSequence2.length() - 1;
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

		// Token: 0x04000114 RID: 276
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal string val$bContent = A_1;

		// Token: 0x04000115 RID: 277
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal bool val$shouldMatch = A_2;
	}
}
