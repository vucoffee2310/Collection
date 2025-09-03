using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000042 RID: 66
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "java.lang.CharSequence" })]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.PhoneticEngine", "cacheSubSequence", "(Ljava.lang.CharSequence;)Ljava.lang.CharSequence;")]
	[SourceFile("PhoneticEngine.java")]
	internal sealed class PhoneticEngine$1 : Object, CharSequence.__Interface
	{
		// Token: 0x0600027B RID: 635 RVA: 0x0000E64C File Offset: 0x0000C84C
		[LineNumberTable(255)]
		[MethodImpl(8)]
		internal PhoneticEngine$1(CharSequence A_1, object[][] A_2)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			this.val$cached = charSequence2;
			this.val$cache = A_2;
			base..ctor();
		}

		// Token: 0x0600027C RID: 636 RVA: 0x0000E68C File Offset: 0x0000C88C
		[LineNumberTable(258)]
		[MethodImpl(8)]
		public char charAt(int A_1)
		{
			CharSequence charSequence = this.val$cached;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = _<ref>;
			return charSequence2.charAt(A_1);
		}

		// Token: 0x0600027D RID: 637 RVA: 0x0000E6BC File Offset: 0x0000C8BC
		[LineNumberTable(263)]
		[MethodImpl(8)]
		public int length()
		{
			CharSequence charSequence = this.val$cached;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = _<ref>;
			return charSequence2.length();
		}

		// Token: 0x0600027E RID: 638 RVA: 0x0000E6EC File Offset: 0x0000C8EC
		[LineNumberTable(new byte[] { 160, 154, 100, 182, 109, 99, 127, 21, 141 })]
		[MethodImpl(8)]
		public CharSequence subSequence(int A_1, int A_2)
		{
			if (A_1 == A_2)
			{
				object obj = "";
				CharSequence charSequence;
				charSequence.__<ref> = obj;
				return charSequence;
			}
			object obj2 = this.val$cache[A_1][A_2 - 1];
			if (obj2 == null)
			{
				CharSequence charSequence2 = this.val$cached;
				object _<ref> = charSequence2.__<ref>;
				CharSequence charSequence3;
				charSequence3.__<ref> = _<ref>;
				obj2 = charSequence3.subSequence(A_1, A_2).__<ref>;
				this.val$cache[A_1][A_2 - 1] = obj2;
			}
			object obj3 = obj2;
			CharSequence charSequence4;
			charSequence4.__<ref> = obj3;
			return charSequence4;
		}

		// Token: 0x0600027F RID: 639 RVA: 0x0000E777 File Offset: 0x0000C977
		[HideFromJava]
		string CharSequence.__Interface.String;toString()
		{
			return Object.instancehelper_toString(this);
		}

		// Token: 0x040000F2 RID: 242
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal CharSequence val$cached;

		// Token: 0x040000F3 RID: 243
		[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
		internal object[][] val$cache;
	}
}
