using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x0200001E RID: 30
	[Implements(new string[] { "com.edc.classbook.util.codec.BinaryDecoder", "com.edc.classbook.util.codec.BinaryEncoder" })]
	public class BinaryCodec : Object, BinaryDecoder, Decoder, BinaryEncoder, Encoder
	{
		// Token: 0x0600010E RID: 270 RVA: 0x00005AB5 File Offset: 0x00003CB5
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x0600010F RID: 271 RVA: 0x00005AB8 File Offset: 0x00003CB8
		[LineNumberTable(new byte[]
		{
			160, 125, 104, 166, 234, 69, 108, 107, 109, 137,
			231, 60, 38, 235, 73
		})]
		[MethodImpl(8)]
		public static byte[] toAsciiBytes(byte[] raw)
		{
			if (BinaryCodec.isEmpty(raw))
			{
				return BinaryCodec.EMPTY_BYTE_ARRAY;
			}
			byte[] array = new byte[raw.Length << 3];
			int i = 0;
			int num = array.Length - 1;
			while (i < raw.Length)
			{
				for (int j = 0; j < BinaryCodec.BITS.Length; j++)
				{
					if (((int)raw[i] & BinaryCodec.BITS[j]) == 0)
					{
						array[num - j] = 48;
					}
					else
					{
						array[num - j] = 49;
					}
				}
				i++;
				num += -8;
			}
			return array;
		}

		// Token: 0x06000110 RID: 272 RVA: 0x00005B24 File Offset: 0x00003D24
		[LineNumberTable(new byte[]
		{
			160, 155, 104, 166, 234, 69, 108, 107, 109, 137,
			231, 60, 38, 235, 73
		})]
		[MethodImpl(8)]
		public static char[] toAsciiChars(byte[] raw)
		{
			if (BinaryCodec.isEmpty(raw))
			{
				return BinaryCodec.EMPTY_CHAR_ARRAY;
			}
			char[] array = new char[raw.Length << 3];
			int i = 0;
			int num = array.Length - 1;
			while (i < raw.Length)
			{
				for (int j = 0; j < BinaryCodec.BITS.Length; j++)
				{
					if (((int)raw[i] & BinaryCodec.BITS[j]) == 0)
					{
						array[num - j] = '0';
					}
					else
					{
						array[num - j] = '1';
					}
				}
				i++;
				num += -8;
			}
			return array;
		}

		// Token: 0x06000111 RID: 273 RVA: 0x00005B90 File Offset: 0x00003D90
		[LineNumberTable(new byte[]
		{
			160, 85, 104, 166, 234, 69, 111, 107, 105, 25,
			38, 238, 71
		})]
		[MethodImpl(8)]
		public static byte[] fromAscii(byte[] ascii)
		{
			if (BinaryCodec.isEmpty(ascii))
			{
				return BinaryCodec.EMPTY_BYTE_ARRAY;
			}
			byte[] array = new byte[ascii.Length >> 3];
			int i = 0;
			int num = ascii.Length - 1;
			while (i < array.Length)
			{
				for (int j = 0; j < BinaryCodec.BITS.Length; j++)
				{
					if (ascii[num - j] == 49)
					{
						byte[] array2 = array;
						int num2 = i;
						byte[] array3 = array2;
						array3[num2] = (byte)((sbyte)((int)array3[num2] | BinaryCodec.BITS[j]));
					}
				}
				i++;
				num += -8;
			}
			return array;
		}

		// Token: 0x06000112 RID: 274 RVA: 0x00005C08 File Offset: 0x00003E08
		[LineNumberTable(new byte[]
		{
			122, 103, 166, 234, 69, 111, 107, 105, 25, 38,
			238, 71
		})]
		public static byte[] fromAscii(char[] ascii)
		{
			if (ascii == null || ascii.Length == 0)
			{
				return BinaryCodec.EMPTY_BYTE_ARRAY;
			}
			byte[] array = new byte[ascii.Length >> 3];
			int i = 0;
			int num = ascii.Length - 1;
			while (i < array.Length)
			{
				for (int j = 0; j < BinaryCodec.BITS.Length; j++)
				{
					if (ascii[num - j] == '1')
					{
						byte[] array2 = array;
						int num2 = i;
						byte[] array3 = array2;
						array3[num2] = (byte)((sbyte)((int)array3[num2] | BinaryCodec.BITS[j]));
					}
				}
				i++;
				num += -8;
			}
			return array;
		}

		// Token: 0x06000113 RID: 275 RVA: 0x00005C7D File Offset: 0x00003E7D
		[LineNumberTable(226)]
		private static bool isEmpty(byte[] A_0)
		{
			return A_0 == null || A_0.Length == 0;
		}

		// Token: 0x06000114 RID: 276 RVA: 0x00005C8A File Offset: 0x00003E8A
		[LineNumberTable(36)]
		[MethodImpl(8)]
		public BinaryCodec()
		{
		}

		// Token: 0x06000115 RID: 277 RVA: 0x00005C94 File Offset: 0x00003E94
		[LineNumberTable(83)]
		[MethodImpl(8)]
		public virtual byte[] encode(byte[] raw)
		{
			return BinaryCodec.toAsciiBytes(raw);
		}

		// Token: 0x06000116 RID: 278 RVA: 0x00005C9E File Offset: 0x00003E9E
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 48, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object raw)
		{
			if (!(raw is byte[]))
			{
				string text = "argument not a byte array";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return BinaryCodec.toAsciiChars((byte[])((byte[])raw));
		}

		// Token: 0x06000117 RID: 279 RVA: 0x00005CCC File Offset: 0x00003ECC
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 66, 99, 134, 104, 147, 104, 147, 104, 147 })]
		[MethodImpl(8)]
		public virtual object decode(object ascii)
		{
			if (ascii == null)
			{
				return BinaryCodec.EMPTY_BYTE_ARRAY;
			}
			if (ascii is byte[])
			{
				return BinaryCodec.fromAscii((byte[])((byte[])ascii));
			}
			if (ascii is char[])
			{
				return BinaryCodec.fromAscii((char[])((char[])ascii));
			}
			if (ascii is string)
			{
				return BinaryCodec.fromAscii(String.instancehelper_toCharArray((string)ascii));
			}
			string text = "argument not a byte array";
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x06000118 RID: 280 RVA: 0x00005D42 File Offset: 0x00003F42
		[LineNumberTable(141)]
		[MethodImpl(8)]
		public virtual byte[] decode(byte[] ascii)
		{
			return BinaryCodec.fromAscii(ascii);
		}

		// Token: 0x06000119 RID: 281 RVA: 0x00005D4C File Offset: 0x00003F4C
		[LineNumberTable(new byte[] { 103, 99, 134 })]
		[MethodImpl(8)]
		public virtual byte[] toByteArray(string ascii)
		{
			if (ascii == null)
			{
				return BinaryCodec.EMPTY_BYTE_ARRAY;
			}
			return BinaryCodec.fromAscii(String.instancehelper_toCharArray(ascii));
		}

		// Token: 0x0600011A RID: 282 RVA: 0x00005D64 File Offset: 0x00003F64
		[LineNumberTable(299)]
		[MethodImpl(8)]
		public static string toAsciiString(byte[] raw)
		{
			return String.newhelper(BinaryCodec.toAsciiChars(raw));
		}

		// Token: 0x0400007B RID: 123
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] EMPTY_CHAR_ARRAY = new char[0];

		// Token: 0x0400007C RID: 124
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] EMPTY_BYTE_ARRAY = new byte[0];

		// Token: 0x0400007D RID: 125
		private const int BIT_0 = 1;

		// Token: 0x0400007E RID: 126
		private const int BIT_1 = 2;

		// Token: 0x0400007F RID: 127
		private const int BIT_2 = 4;

		// Token: 0x04000080 RID: 128
		private const int BIT_3 = 8;

		// Token: 0x04000081 RID: 129
		private const int BIT_4 = 16;

		// Token: 0x04000082 RID: 130
		private const int BIT_5 = 32;

		// Token: 0x04000083 RID: 131
		private const int BIT_6 = 64;

		// Token: 0x04000084 RID: 132
		private const int BIT_7 = 128;

		// Token: 0x04000085 RID: 133
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static int[] BITS = new int[] { 1, 2, 4, 8, 16, 32, 64, 128 };
	}
}
