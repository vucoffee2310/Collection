using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200003B RID: 59
	[InnerClass(null, Modifiers.Static)]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Languages", null, null)]
	[SourceFile("Languages.java")]
	internal sealed class Languages$1 : Languages.LanguageSet
	{
		// Token: 0x0600024A RID: 586 RVA: 0x0000E25C File Offset: 0x0000C45C
		[LineNumberTable(189)]
		[MethodImpl(8)]
		internal Languages$1()
		{
		}

		// Token: 0x0600024B RID: 587 RVA: 0x0000E266 File Offset: 0x0000C466
		public override bool contains(string A_1)
		{
			return false;
		}

		// Token: 0x0600024C RID: 588 RVA: 0x0000E269 File Offset: 0x0000C469
		[LineNumberTable(197)]
		[MethodImpl(8)]
		public override string getAny()
		{
			string text = "Can't fetch any language from the empty language set.";
			Throwable.__<suppressFillInStackTrace>();
			throw new NoSuchElementException(text);
		}

		// Token: 0x0600024D RID: 589 RVA: 0x0000E27A File Offset: 0x0000C47A
		public override bool isEmpty()
		{
			return true;
		}

		// Token: 0x0600024E RID: 590 RVA: 0x0000E27D File Offset: 0x0000C47D
		public override bool isSingleton()
		{
			return false;
		}

		// Token: 0x0600024F RID: 591 RVA: 0x0000E280 File Offset: 0x0000C480
		public override Languages.LanguageSet restrictTo(Languages.LanguageSet A_1)
		{
			return this;
		}

		// Token: 0x06000250 RID: 592 RVA: 0x0000E283 File Offset: 0x0000C483
		public override string toString()
		{
			return "NO_LANGUAGES";
		}
	}
}
