using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200003C RID: 60
	[InnerClass(null, Modifiers.Static)]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Languages", null, null)]
	[SourceFile("Languages.java")]
	internal sealed class Languages$2 : Languages.LanguageSet
	{
		// Token: 0x06000251 RID: 593 RVA: 0x0000E28A File Offset: 0x0000C48A
		[LineNumberTable(224)]
		[MethodImpl(8)]
		internal Languages$2()
		{
		}

		// Token: 0x06000252 RID: 594 RVA: 0x0000E294 File Offset: 0x0000C494
		public override bool contains(string A_1)
		{
			return true;
		}

		// Token: 0x06000253 RID: 595 RVA: 0x0000E297 File Offset: 0x0000C497
		[LineNumberTable(232)]
		[MethodImpl(8)]
		public override string getAny()
		{
			string text = "Can't fetch any language from the any language set.";
			Throwable.__<suppressFillInStackTrace>();
			throw new NoSuchElementException(text);
		}

		// Token: 0x06000254 RID: 596 RVA: 0x0000E2A8 File Offset: 0x0000C4A8
		public override bool isEmpty()
		{
			return false;
		}

		// Token: 0x06000255 RID: 597 RVA: 0x0000E2AB File Offset: 0x0000C4AB
		public override bool isSingleton()
		{
			return false;
		}

		// Token: 0x06000256 RID: 598 RVA: 0x0000E2AE File Offset: 0x0000C4AE
		public override Languages.LanguageSet restrictTo(Languages.LanguageSet A_1)
		{
			return A_1;
		}

		// Token: 0x06000257 RID: 599 RVA: 0x0000E2B1 File Offset: 0x0000C4B1
		public override string toString()
		{
			return "ANY_LANGUAGE";
		}
	}
}
