using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000021 RID: 33
	[Modifiers(Modifiers.Super)]
	internal sealed class B64 : Object
	{
		// Token: 0x06000141 RID: 321 RVA: 0x0000635F File Offset: 0x0000455F
		[LineNumberTable(33)]
		[MethodImpl(8)]
		internal B64()
		{
		}

		// Token: 0x06000142 RID: 322 RVA: 0x0000636C File Offset: 0x0000456C
		[LineNumberTable(new byte[] { 159, 128, 73, 157, 99, 107, 118, 134 })]
		[MethodImpl(8)]
		internal static void b64from24bit(byte A_0, byte A_1, byte A_2, int A_3, StringBuilder A_4)
		{
			int num = (int)((sbyte)A_0);
			int num2 = (int)((sbyte)A_1);
			int num3 = (int)((sbyte)A_2);
			int num4 = ((num << 16) & 16777215) | ((num2 << 8) & 65535) | (num3 & 255);
			int num5 = A_3;
			for (;;)
			{
				int num6 = num5;
				num5 += -1;
				if (num6 <= 0)
				{
					break;
				}
				A_4.append(String.instancehelper_charAt("./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", num4 & 63));
				num4 >>= 6;
			}
		}

		// Token: 0x06000143 RID: 323 RVA: 0x000063CC File Offset: 0x000045CC
		[LineNumberTable(new byte[] { 22, 102, 102, 63, 6, 166 })]
		[MethodImpl(8)]
		internal static string getRandomSalt(int A_0)
		{
			StringBuilder stringBuilder = new StringBuilder();
			for (int i = 1; i <= A_0; i++)
			{
				stringBuilder.append(String.instancehelper_charAt("./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", new Random().nextInt(String.instancehelper_length("./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"))));
			}
			return stringBuilder.toString();
		}

		// Token: 0x0400008B RID: 139
		internal const string B64T = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	}
}
