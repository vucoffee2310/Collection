using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000048 RID: 72
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$RPattern" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule", null, null)]
	[SourceFile("Rule.java")]
	internal sealed class Rule$1 : Object, Rule.RPattern
	{
		// Token: 0x0600029E RID: 670 RVA: 0x0000F48C File Offset: 0x0000D68C
		[LineNumberTable(159)]
		[MethodImpl(8)]
		internal Rule$1()
		{
		}

		// Token: 0x0600029F RID: 671 RVA: 0x0000F496 File Offset: 0x0000D696
		public bool isMatch(CharSequence A_1)
		{
			return true;
		}
	}
}
