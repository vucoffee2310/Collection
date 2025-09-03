using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000036 RID: 54
	internal sealed class SoundexUtils : Object
	{
		// Token: 0x0600022E RID: 558 RVA: 0x0000DC54 File Offset: 0x0000BE54
		[LineNumberTable(new byte[]
		{
			159, 184, 107, 130, 103, 103, 98, 102, 110, 14,
			230, 69, 100, 142
		})]
		[MethodImpl(8)]
		internal static string clean(string A_0)
		{
			if (A_0 == null || String.instancehelper_length(A_0) == 0)
			{
				return A_0;
			}
			int num = String.instancehelper_length(A_0);
			char[] array = new char[num];
			int num2 = 0;
			for (int i = 0; i < num; i++)
			{
				if (Character.isLetter(String.instancehelper_charAt(A_0, i)))
				{
					char[] array2 = array;
					int num3 = num2;
					num2++;
					array2[num3] = String.instancehelper_charAt(A_0, i);
				}
			}
			if (num2 == num)
			{
				return String.instancehelper_toUpperCase(A_0, Locale.ENGLISH);
			}
			return String.instancehelper_toUpperCase(String.newhelper(array, 0, num2), Locale.ENGLISH);
		}

		// Token: 0x0600022F RID: 559 RVA: 0x0000DCCC File Offset: 0x0000BECC
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(86)]
		[MethodImpl(8)]
		internal static int difference(StringEncoder A_0, string A_1, string A_2)
		{
			return SoundexUtils.differenceEncoded(A_0.encode(A_1), A_0.encode(A_2));
		}

		// Token: 0x06000230 RID: 560 RVA: 0x0000DCE4 File Offset: 0x0000BEE4
		[LineNumberTable(new byte[] { 61, 102, 130, 114, 98, 102, 112, 4, 230, 69 })]
		[MethodImpl(8)]
		internal static int differenceEncoded(string A_0, string A_1)
		{
			if (A_0 == null || A_1 == null)
			{
				return 0;
			}
			int num = Math.min(String.instancehelper_length(A_0), String.instancehelper_length(A_1));
			int num2 = 0;
			for (int i = 0; i < num; i++)
			{
				if (String.instancehelper_charAt(A_0, i) == String.instancehelper_charAt(A_1, i))
				{
					num2++;
				}
			}
			return num2;
		}

		// Token: 0x06000231 RID: 561 RVA: 0x0000DD2E File Offset: 0x0000BF2E
		[LineNumberTable(31)]
		[MethodImpl(8)]
		internal SoundexUtils()
		{
		}
	}
}
