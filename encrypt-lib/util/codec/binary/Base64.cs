using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;
using java.math;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000017 RID: 23
	public class Base64 : BaseNCodec
	{
		// Token: 0x060000C0 RID: 192 RVA: 0x000049D1 File Offset: 0x00002BD1
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060000C1 RID: 193 RVA: 0x000049D3 File Offset: 0x00002BD3
		[LineNumberTable(new byte[] { 160, 98, 110 })]
		[MethodImpl(8)]
		public Base64(int lineLength)
			: this(lineLength, Base64.CHUNK_SEPARATOR)
		{
		}

		// Token: 0x060000C2 RID: 194 RVA: 0x000049E4 File Offset: 0x00002BE4
		[LineNumberTable(new byte[]
		{
			159, 75, 98, 243, 159, 127, 235, 160, 134, 102,
			105, 103, 159, 16, 100, 106, 109, 146, 103, 169,
			103, 135, 110, 117
		})]
		[MethodImpl(8)]
		public Base64(int lineLength, byte[] lineSeparator, bool urlSafe)
			: base(3, 4, lineLength, (lineSeparator != null) ? lineSeparator.Length : 0)
		{
			this.decodeTable = Base64.DECODE_TABLE;
			if (lineSeparator != null)
			{
				if (this.containsAlphabetOrPad(lineSeparator))
				{
					string text = StringUtils.newStringUtf8(lineSeparator);
					string text2 = new StringBuilder().append("lineSeparator must not contain base64 characters: [").append(text).append("]")
						.toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalArgumentException(text2);
				}
				if (lineLength > 0)
				{
					this.encodeSize = 4 + lineSeparator.Length;
					this.lineSeparator = new byte[lineSeparator.Length];
					ByteCodeHelper.arraycopy_primitive_1(lineSeparator, 0, this.lineSeparator, 0, lineSeparator.Length);
				}
				else
				{
					this.encodeSize = 4;
					this.lineSeparator = null;
				}
			}
			else
			{
				this.encodeSize = 4;
				this.lineSeparator = null;
			}
			this.decodeSize = this.encodeSize - 1;
			this.encodeTable = ((!urlSafe) ? Base64.STANDARD_ENCODE_TABLE : Base64.URL_SAFE_ENCODE_TABLE);
		}

		// Token: 0x060000C3 RID: 195 RVA: 0x00004AC4 File Offset: 0x00002CC4
		[LineNumberTable(new byte[] { 160, 125, 107 })]
		[MethodImpl(8)]
		public Base64(int lineLength, byte[] lineSeparator)
			: this(lineLength, lineSeparator, false)
		{
		}

		// Token: 0x060000C4 RID: 196 RVA: 0x00004AD4 File Offset: 0x00002CD4
		[LineNumberTable(new byte[] { 161, 163, 103, 116, 2, 230, 69 })]
		[MethodImpl(8)]
		public static bool isBase64(byte[] arrayOctet)
		{
			for (int i = 0; i < arrayOctet.Length; i++)
			{
				if (!Base64.isBase64(arrayOctet[i]) && !BaseNCodec.isWhiteSpace(arrayOctet[i]))
				{
					return false;
				}
			}
			return true;
		}

		// Token: 0x060000C5 RID: 197 RVA: 0x00004B08 File Offset: 0x00002D08
		[LineNumberTable(505)]
		public static bool isBase64(byte octet)
		{
			int num = (int)((sbyte)octet);
			return num == 61 || (num >= 0 && num < Base64.DECODE_TABLE.Length && (int)Base64.DECODE_TABLE[num] != -1);
		}

		// Token: 0x060000C6 RID: 198 RVA: 0x00004B38 File Offset: 0x00002D38
		[LineNumberTable(616)]
		[MethodImpl(8)]
		public static byte[] encodeBase64(byte[] binaryData, bool isChunked)
		{
			return Base64.encodeBase64(binaryData, isChunked, false);
		}

		// Token: 0x060000C7 RID: 199 RVA: 0x00004B54 File Offset: 0x00002D54
		[LineNumberTable(634)]
		[MethodImpl(8)]
		public static byte[] encodeBase64(byte[] binaryData, bool isChunked, bool urlSafe)
		{
			return Base64.encodeBase64(binaryData, isChunked, urlSafe, int.MaxValue);
		}

		// Token: 0x060000C8 RID: 200 RVA: 0x00004B74 File Offset: 0x00002D74
		[LineNumberTable(new byte[]
		{
			158, 235, 132, 103, 226, 69, 120, 104, 101, 255,
			22, 70
		})]
		[MethodImpl(8)]
		public static byte[] encodeBase64(byte[] binaryData, bool isChunked, bool urlSafe, int maxResultSize)
		{
			if (binaryData == null || binaryData.Length == 0)
			{
				return binaryData;
			}
			Base64 @base = ((!isChunked) ? new Base64(0, Base64.CHUNK_SEPARATOR, urlSafe) : new Base64(urlSafe));
			long encodedLength = @base.getEncodedLength(binaryData);
			if (encodedLength > (long)maxResultSize)
			{
				string text = new StringBuilder().append("Input array too big, the output array would be bigger (").append(encodedLength).append(") than the specified maximum size of ")
					.append(maxResultSize)
					.toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			return @base.encode(binaryData);
		}

		// Token: 0x060000C9 RID: 201 RVA: 0x00004BF4 File Offset: 0x00002DF4
		[LineNumberTable(new byte[] { 159, 95, 98, 112 })]
		[MethodImpl(8)]
		public Base64(bool urlSafe)
			: this(76, Base64.CHUNK_SEPARATOR, urlSafe)
		{
		}

		// Token: 0x060000CA RID: 202 RVA: 0x00004C13 File Offset: 0x00002E13
		[LineNumberTable(new byte[] { 120, 105 })]
		[MethodImpl(8)]
		public Base64()
			: this(0)
		{
		}

		// Token: 0x060000CB RID: 203 RVA: 0x00004C1E File Offset: 0x00002E1E
		[LineNumberTable(692)]
		[MethodImpl(8)]
		public static byte[] decodeBase64(byte[] base64Data)
		{
			return new Base64().decode(base64Data);
		}

		// Token: 0x060000CC RID: 204 RVA: 0x00004C30 File Offset: 0x00002E30
		[LineNumberTable(new byte[]
		{
			162, 109, 135, 104, 135, 127, 3, 162, 98, 163,
			115, 98, 132, 103, 106, 108
		})]
		[MethodImpl(8)]
		internal static byte[] toIntegerBytes(BigInteger A_0)
		{
			int num = A_0.bitLength();
			num = num + 7 >> 3 << 3;
			byte[] array = A_0.toByteArray();
			bool flag = A_0.bitLength() != 0;
			int num2 = 8;
			if (num2 != -1 && (flag ? 1 : 0) % num2 != 0 && A_0.bitLength() / 8 + 1 == num / 8)
			{
				return array;
			}
			int num3 = 0;
			int num4 = array.Length;
			bool flag2 = A_0.bitLength() != 0;
			int num5 = 8;
			if (num5 == -1 || (flag2 ? 1 : 0) % num5 == 0)
			{
				num3 = 1;
				num4 += -1;
			}
			int num6 = num / 8 - num4;
			byte[] array2 = new byte[num / 8];
			ByteCodeHelper.arraycopy_primitive_1(array, num3, array2, num6, num4);
			return array2;
		}

		// Token: 0x060000CD RID: 205 RVA: 0x00004CB4 File Offset: 0x00002EB4
		public virtual bool isUrlSafe()
		{
			return this.encodeTable == Base64.URL_SAFE_ENCODE_TABLE;
		}

		// Token: 0x060000CE RID: 206 RVA: 0x00004CC4 File Offset: 0x00002EC4
		[LineNumberTable(new byte[]
		{
			160, 213, 105, 193, 103, 104, 114, 129, 111, 104,
			157, 165, 159, 10, 159, 10, 112, 120, 253, 69,
			127, 11, 127, 10, 159, 10, 109, 218, 159, 12,
			151, 115, 123, 149, 101, 107, 112, 123, 106, 101,
			138, 115, 109, 127, 12, 127, 12, 127, 11, 127,
			9, 111, 120, 124, 117, 232, 47, 235, 86
		})]
		[MethodImpl(8)]
		internal override void encode(byte[] A_1, int A_2, int A_3, BaseNCodec.Context A_4)
		{
			if (A_4.eof)
			{
				return;
			}
			if (A_3 < 0)
			{
				A_4.eof = true;
				if (0 == A_4.modulus && this.__<>lineLength == 0)
				{
					return;
				}
				byte[] array = this.ensureBufferSize(this.encodeSize, A_4);
				int pos = A_4.pos;
				switch (A_4.modulus)
				{
				case 0:
					break;
				case 1:
				{
					byte[] array2 = array;
					int num = A_4.pos;
					int num2 = num;
					A_4.pos = num + 1;
					array2[num2] = this.encodeTable[(A_4.ibitWorkArea >> 2) & 63];
					byte[] array3 = array;
					num = A_4.pos;
					int num3 = num;
					A_4.pos = num + 1;
					array3[num3] = this.encodeTable[(A_4.ibitWorkArea << 4) & 63];
					if (this.encodeTable == Base64.STANDARD_ENCODE_TABLE)
					{
						byte[] array4 = array;
						num = A_4.pos;
						int num4 = num;
						A_4.pos = num + 1;
						array4[num4] = 61;
						byte[] array5 = array;
						num = A_4.pos;
						int num5 = num;
						A_4.pos = num + 1;
						array5[num5] = 61;
					}
					break;
				}
				case 2:
				{
					byte[] array6 = array;
					int num = A_4.pos;
					int num6 = num;
					A_4.pos = num + 1;
					array6[num6] = this.encodeTable[(A_4.ibitWorkArea >> 10) & 63];
					byte[] array7 = array;
					num = A_4.pos;
					int num7 = num;
					A_4.pos = num + 1;
					array7[num7] = this.encodeTable[(A_4.ibitWorkArea >> 4) & 63];
					byte[] array8 = array;
					num = A_4.pos;
					int num8 = num;
					A_4.pos = num + 1;
					array8[num8] = this.encodeTable[(A_4.ibitWorkArea << 2) & 63];
					if (this.encodeTable == Base64.STANDARD_ENCODE_TABLE)
					{
						byte[] array9 = array;
						num = A_4.pos;
						int num9 = num;
						A_4.pos = num + 1;
						array9[num9] = 61;
					}
					break;
				}
				default:
				{
					string text = new StringBuilder().append("Impossible modulus ").append(A_4.modulus).toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalStateException(text);
				}
				}
				A_4.currentLinePos += A_4.pos - pos;
				if (this.__<>lineLength > 0 && A_4.currentLinePos > 0)
				{
					ByteCodeHelper.arraycopy_primitive_1(this.lineSeparator, 0, array, A_4.pos, this.lineSeparator.Length);
					A_4.pos += this.lineSeparator.Length;
				}
			}
			else
			{
				for (int i = 0; i < A_3; i++)
				{
					byte[] array10 = this.ensureBufferSize(this.encodeSize, A_4);
					int num10 = A_4.modulus + 1;
					int num11 = 3;
					A_4.modulus = ((num11 != -1) ? (num10 % num11) : 0);
					int num12 = A_2;
					A_2++;
					int num13 = (int)A_1[num12];
					if (num13 < 0)
					{
						num13 += 256;
					}
					A_4.ibitWorkArea = (A_4.ibitWorkArea << 8) + num13;
					if (0 == A_4.modulus)
					{
						byte[] array11 = array10;
						int num = A_4.pos;
						int num14 = num;
						A_4.pos = num + 1;
						array11[num14] = this.encodeTable[(A_4.ibitWorkArea >> 18) & 63];
						byte[] array12 = array10;
						num = A_4.pos;
						int num15 = num;
						A_4.pos = num + 1;
						array12[num15] = this.encodeTable[(A_4.ibitWorkArea >> 12) & 63];
						byte[] array13 = array10;
						num = A_4.pos;
						int num16 = num;
						A_4.pos = num + 1;
						array13[num16] = this.encodeTable[(A_4.ibitWorkArea >> 6) & 63];
						byte[] array14 = array10;
						num = A_4.pos;
						int num17 = num;
						A_4.pos = num + 1;
						array14[num17] = this.encodeTable[A_4.ibitWorkArea & 63];
						A_4.currentLinePos += 4;
						if (this.__<>lineLength > 0 && this.__<>lineLength <= A_4.currentLinePos)
						{
							ByteCodeHelper.arraycopy_primitive_1(this.lineSeparator, 0, array10, A_4.pos, this.lineSeparator.Length);
							A_4.pos += this.lineSeparator.Length;
							A_4.currentLinePos = 0;
						}
					}
				}
			}
		}

		// Token: 0x060000CF RID: 207 RVA: 0x0000507C File Offset: 0x0000327C
		[LineNumberTable(new byte[]
		{
			161, 54, 105, 129, 100, 136, 105, 111, 105, 133,
			104, 133, 115, 104, 103, 123, 114, 108, 127, 13,
			127, 12, 255, 10, 48, 233, 90, 120, 208, 223,
			0, 133, 112, 127, 11, 133, 112, 127, 13, 127,
			11, 130, 191, 12
		})]
		[MethodImpl(8)]
		internal override void decode(byte[] A_1, int A_2, int A_3, BaseNCodec.Context A_4)
		{
			if (A_4.eof)
			{
				return;
			}
			if (A_3 < 0)
			{
				A_4.eof = true;
			}
			for (int i = 0; i < A_3; i++)
			{
				byte[] array = this.ensureBufferSize(this.decodeSize, A_4);
				int num = A_2;
				A_2++;
				int num2 = (int)A_1[num];
				if (num2 == 61)
				{
					A_4.eof = true;
					break;
				}
				if (num2 >= 0 && num2 < Base64.DECODE_TABLE.Length)
				{
					int num3 = (int)Base64.DECODE_TABLE[num2];
					if (num3 >= 0)
					{
						int num4 = A_4.modulus + 1;
						int num5 = 4;
						A_4.modulus = ((num5 != -1) ? (num4 % num5) : 0);
						A_4.ibitWorkArea = (A_4.ibitWorkArea << 6) + num3;
						if (A_4.modulus == 0)
						{
							byte[] array2 = array;
							int num6 = A_4.pos;
							int num7 = num6;
							A_4.pos = num6 + 1;
							array2[num7] = (sbyte)((A_4.ibitWorkArea >> 16) & 255);
							byte[] array3 = array;
							num6 = A_4.pos;
							int num8 = num6;
							A_4.pos = num6 + 1;
							array3[num8] = (sbyte)((A_4.ibitWorkArea >> 8) & 255);
							byte[] array4 = array;
							num6 = A_4.pos;
							int num9 = num6;
							A_4.pos = num6 + 1;
							array4[num9] = (sbyte)(A_4.ibitWorkArea & 255);
						}
					}
				}
			}
			if (A_4.eof && A_4.modulus != 0)
			{
				byte[] array5 = this.ensureBufferSize(this.decodeSize, A_4);
				switch (A_4.modulus)
				{
				case 1:
					break;
				case 2:
				{
					A_4.ibitWorkArea >>= 4;
					byte[] array6 = array5;
					int num6 = A_4.pos;
					int num10 = num6;
					A_4.pos = num6 + 1;
					array6[num10] = (sbyte)(A_4.ibitWorkArea & 255);
					break;
				}
				case 3:
				{
					A_4.ibitWorkArea >>= 2;
					byte[] array7 = array5;
					int num6 = A_4.pos;
					int num11 = num6;
					A_4.pos = num6 + 1;
					array7[num11] = (sbyte)((A_4.ibitWorkArea >> 8) & 255);
					byte[] array8 = array5;
					num6 = A_4.pos;
					int num12 = num6;
					A_4.pos = num6 + 1;
					array8[num12] = (sbyte)(A_4.ibitWorkArea & 255);
					break;
				}
				default:
				{
					string text = new StringBuilder().append("Impossible modulus ").append(A_4.modulus).toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalStateException(text);
				}
				}
			}
		}

		// Token: 0x060000D0 RID: 208 RVA: 0x000052D4 File Offset: 0x000034D4
		[Obsolete]
		[LineNumberTable(493)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static bool isArrayByteBase64(byte[] arrayOctet)
		{
			return Base64.isBase64(arrayOctet);
		}

		// Token: 0x060000D1 RID: 209 RVA: 0x000052DE File Offset: 0x000034DE
		[LineNumberTable(519)]
		[MethodImpl(8)]
		public static bool isBase64(string base64)
		{
			return Base64.isBase64(StringUtils.getBytesUtf8(base64));
		}

		// Token: 0x060000D2 RID: 210 RVA: 0x000052ED File Offset: 0x000034ED
		[LineNumberTable(549)]
		[MethodImpl(8)]
		public static byte[] encodeBase64(byte[] binaryData)
		{
			return Base64.encodeBase64(binaryData, false);
		}

		// Token: 0x060000D3 RID: 211 RVA: 0x000052F8 File Offset: 0x000034F8
		[LineNumberTable(564)]
		[MethodImpl(8)]
		public static string encodeBase64String(byte[] binaryData)
		{
			return StringUtils.newStringUtf8(Base64.encodeBase64(binaryData, false));
		}

		// Token: 0x060000D4 RID: 212 RVA: 0x00005308 File Offset: 0x00003508
		[LineNumberTable(577)]
		[MethodImpl(8)]
		public static byte[] encodeBase64URLSafe(byte[] binaryData)
		{
			return Base64.encodeBase64(binaryData, false, true);
		}

		// Token: 0x060000D5 RID: 213 RVA: 0x00005314 File Offset: 0x00003514
		[LineNumberTable(590)]
		[MethodImpl(8)]
		public static string encodeBase64URLSafeString(byte[] binaryData)
		{
			return StringUtils.newStringUtf8(Base64.encodeBase64(binaryData, false, true));
		}

		// Token: 0x060000D6 RID: 214 RVA: 0x00005325 File Offset: 0x00003525
		[LineNumberTable(601)]
		[MethodImpl(8)]
		public static byte[] encodeBase64Chunked(byte[] binaryData)
		{
			return Base64.encodeBase64(binaryData, true);
		}

		// Token: 0x060000D7 RID: 215 RVA: 0x00005330 File Offset: 0x00003530
		[LineNumberTable(681)]
		[MethodImpl(8)]
		public static byte[] decodeBase64(string base64String)
		{
			return new Base64().decode(base64String);
		}

		// Token: 0x060000D8 RID: 216 RVA: 0x0000533F File Offset: 0x0000353F
		[LineNumberTable(707)]
		[MethodImpl(8)]
		public static BigInteger decodeInteger(byte[] pArray)
		{
			BigInteger.__<clinit>();
			return new BigInteger(1, Base64.decodeBase64(pArray));
		}

		// Token: 0x060000D9 RID: 217 RVA: 0x00005354 File Offset: 0x00003554
		[LineNumberTable(new byte[] { 162, 95, 99, 144 })]
		[MethodImpl(8)]
		public static byte[] encodeInteger(BigInteger bigInt)
		{
			if (bigInt == null)
			{
				string text = "encodeInteger called with null parameter";
				Throwable.__<suppressFillInStackTrace>();
				throw new NullPointerException(text);
			}
			return Base64.encodeBase64(Base64.toIntegerBytes(bigInt), false);
		}

		// Token: 0x060000DA RID: 218 RVA: 0x00005378 File Offset: 0x00003578
		[LineNumberTable(767)]
		protected internal override bool isInAlphabet(byte octet)
		{
			int num = (int)((sbyte)octet);
			return num >= 0 && num < this.decodeTable.Length && (int)this.decodeTable[num] != -1;
		}

		// Token: 0x04000052 RID: 82
		private const int BITS_PER_ENCODED_BYTE = 6;

		// Token: 0x04000053 RID: 83
		private const int BYTES_PER_UNENCODED_BLOCK = 3;

		// Token: 0x04000054 RID: 84
		private const int BYTES_PER_ENCODED_BLOCK = 4;

		// Token: 0x04000055 RID: 85
		[Modifiers(Modifiers.Static | Modifiers.Final)]
		internal static byte[] CHUNK_SEPARATOR = new byte[] { 13, 10 };

		// Token: 0x04000056 RID: 86
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] STANDARD_ENCODE_TABLE = new byte[]
		{
			65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
			75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
			85, 86, 87, 88, 89, 90, 97, 98, 99, 100,
			101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
			111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
			121, 122, 48, 49, 50, 51, 52, 53, 54, 55,
			56, 57, 43, 47
		};

		// Token: 0x04000057 RID: 87
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] URL_SAFE_ENCODE_TABLE = new byte[]
		{
			65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
			75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
			85, 86, 87, 88, 89, 90, 97, 98, 99, 100,
			101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
			111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
			121, 122, 48, 49, 50, 51, 52, 53, 54, 55,
			56, 57, 45, 95
		};

		// Token: 0x04000058 RID: 88
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] DECODE_TABLE = new byte[]
		{
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			62,
			(byte)(-1),
			62,
			(byte)(-1),
			63,
			52,
			53,
			54,
			55,
			56,
			57,
			58,
			59,
			60,
			61,
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11,
			12,
			13,
			14,
			15,
			16,
			17,
			18,
			19,
			20,
			21,
			22,
			23,
			24,
			25,
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			63,
			(byte)(-1),
			26,
			27,
			28,
			29,
			30,
			31,
			32,
			33,
			34,
			35,
			36,
			37,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			46,
			47,
			48,
			49,
			50,
			51
		};

		// Token: 0x04000059 RID: 89
		private const int MASK_6BITS = 63;

		// Token: 0x0400005A RID: 90
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] encodeTable;

		// Token: 0x0400005B RID: 91
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] decodeTable;

		// Token: 0x0400005C RID: 92
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] lineSeparator;

		// Token: 0x0400005D RID: 93
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int decodeSize;

		// Token: 0x0400005E RID: 94
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int encodeSize;
	}
}
