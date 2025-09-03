using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005F RID: 95
	[Modifiers(Modifiers.Super)]
	internal sealed class Utils : Object
	{
		// Token: 0x06000343 RID: 835 RVA: 0x00011AF8 File Offset: 0x0000FCF8
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 159, 132, 163, 106, 100, 159, 6 })]
		[MethodImpl(8)]
		internal static int digit16(byte A_0)
		{
			int num = (int)((sbyte)A_0);
			int num2 = Character.digit((char)num, 16);
			if (num2 == -1)
			{
				string text = new StringBuilder().append("Invalid URL encoding: not a valid digit (radix 16): ").append(num).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text);
			}
			return num2;
		}

		// Token: 0x06000344 RID: 836 RVA: 0x00011B3C File Offset: 0x0000FD3C
		[LineNumberTable(30)]
		[MethodImpl(8)]
		internal Utils()
		{
		}
	}
}
