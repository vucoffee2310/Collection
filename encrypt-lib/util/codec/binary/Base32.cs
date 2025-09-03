using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000014 RID: 20
	public class Base32 : BaseNCodec
	{
		// Token: 0x060000B0 RID: 176 RVA: 0x00003207 File Offset: 0x00001407
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060000B1 RID: 177 RVA: 0x0000320C File Offset: 0x0000140C
		[LineNumberTable(new byte[] { 159, 100, 130, 107 })]
		[MethodImpl(8)]
		public Base32(bool useHex)
			: this(0, null, useHex)
		{
		}

		// Token: 0x060000B2 RID: 178 RVA: 0x00003228 File Offset: 0x00001428
		[LineNumberTable(new byte[]
		{
			159, 84, 66, 179, 99, 107, 141, 107, 139, 103,
			99, 191, 16, 105, 103, 159, 16, 106, 109, 146,
			103, 135, 110
		})]
		[MethodImpl(8)]
		public Base32(int lineLength, byte[] lineSeparator, bool useHex)
			: base(5, 8, lineLength, (lineSeparator != null) ? lineSeparator.Length : 0)
		{
			if (useHex)
			{
				this.encodeTable = Base32.HEX_ENCODE_TABLE;
				this.decodeTable = Base32.HEX_DECODE_TABLE;
			}
			else
			{
				this.encodeTable = Base32.ENCODE_TABLE;
				this.decodeTable = Base32.DECODE_TABLE;
			}
			if (lineLength > 0)
			{
				if (lineSeparator == null)
				{
					string text = new StringBuilder().append("lineLength ").append(lineLength).append(" > 0, but lineSeparator is null")
						.toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalArgumentException(text);
				}
				if (this.containsAlphabetOrPad(lineSeparator))
				{
					string text2 = StringUtils.newStringUtf8(lineSeparator);
					string text3 = new StringBuilder().append("lineSeparator must not contain Base32 characters: [").append(text2).append("]")
						.toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalArgumentException(text3);
				}
				this.encodeSize = 8 + lineSeparator.Length;
				this.lineSeparator = new byte[lineSeparator.Length];
				ByteCodeHelper.arraycopy_primitive_1(lineSeparator, 0, this.lineSeparator, 0, lineSeparator.Length);
			}
			else
			{
				this.encodeSize = 8;
				this.lineSeparator = null;
			}
			this.decodeSize = this.encodeSize - 1;
		}

		// Token: 0x060000B3 RID: 179 RVA: 0x00003338 File Offset: 0x00001538
		[LineNumberTable(new byte[] { 160, 93, 107 })]
		[MethodImpl(8)]
		public Base32(int lineLength, byte[] lineSeparator)
			: this(lineLength, lineSeparator, false)
		{
		}

		// Token: 0x060000B4 RID: 180 RVA: 0x00003345 File Offset: 0x00001545
		[LineNumberTable(new byte[] { 109, 105 })]
		[MethodImpl(8)]
		public Base32()
			: this(false)
		{
		}

		// Token: 0x060000B5 RID: 181 RVA: 0x00003350 File Offset: 0x00001550
		[LineNumberTable(new byte[] { 160, 71, 110 })]
		[MethodImpl(8)]
		public Base32(int lineLength)
			: this(lineLength, Base32.CHUNK_SEPARATOR)
		{
		}

		// Token: 0x060000B6 RID: 182 RVA: 0x00003360 File Offset: 0x00001560
		[LineNumberTable(new byte[]
		{
			160, 171, 105, 129, 100, 136, 105, 105, 133, 104,
			133, 111, 116, 105, 103, 155, 115, 108, 127, 15,
			127, 15, 127, 15, 127, 14, 255, 12, 45, 233,
			93, 121, 176, 159, 12, 127, 15, 133, 127, 15,
			133, 112, 127, 15, 127, 13, 133, 112, 127, 16,
			127, 15, 127, 13, 133, 112, 127, 16, 127, 15,
			127, 13, 133, 112, 127, 16, 127, 16, 127, 15,
			127, 13, 162, 191, 12
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
				int num = A_2;
				A_2++;
				int num2 = (int)A_1[num];
				if (num2 == 61)
				{
					A_4.eof = true;
					break;
				}
				byte[] array = this.ensureBufferSize(this.decodeSize, A_4);
				if (num2 >= 0 && num2 < this.decodeTable.Length)
				{
					int num3 = (int)this.decodeTable[num2];
					if (num3 >= 0)
					{
						int num4 = A_4.modulus + 1;
						int num5 = 8;
						A_4.modulus = ((num5 != -1) ? (num4 % num5) : 0);
						A_4.lbitWorkArea = (A_4.lbitWorkArea << 5) + (long)num3;
						if (A_4.modulus == 0)
						{
							byte[] array2 = array;
							int num6 = A_4.pos;
							int num7 = num6;
							A_4.pos = num6 + 1;
							array2[num7] = (sbyte)((int)((A_4.lbitWorkArea >> 32) & (long)((ulong)255)));
							byte[] array3 = array;
							num6 = A_4.pos;
							int num8 = num6;
							A_4.pos = num6 + 1;
							array3[num8] = (sbyte)((int)((A_4.lbitWorkArea >> 24) & (long)((ulong)255)));
							byte[] array4 = array;
							num6 = A_4.pos;
							int num9 = num6;
							A_4.pos = num6 + 1;
							array4[num9] = (sbyte)((int)((A_4.lbitWorkArea >> 16) & (long)((ulong)255)));
							byte[] array5 = array;
							num6 = A_4.pos;
							int num10 = num6;
							A_4.pos = num6 + 1;
							array5[num10] = (sbyte)((int)((A_4.lbitWorkArea >> 8) & (long)((ulong)255)));
							byte[] array6 = array;
							num6 = A_4.pos;
							int num11 = num6;
							A_4.pos = num6 + 1;
							array6[num11] = (sbyte)((int)(A_4.lbitWorkArea & (long)((ulong)255)));
						}
					}
				}
			}
			if (A_4.eof && A_4.modulus >= 2)
			{
				byte[] array7 = this.ensureBufferSize(this.decodeSize, A_4);
				switch (A_4.modulus)
				{
				case 2:
				{
					byte[] array8 = array7;
					int num6 = A_4.pos;
					int num12 = num6;
					A_4.pos = num6 + 1;
					array8[num12] = (sbyte)((int)((A_4.lbitWorkArea >> 2) & (long)((ulong)255)));
					break;
				}
				case 3:
				{
					byte[] array9 = array7;
					int num6 = A_4.pos;
					int num13 = num6;
					A_4.pos = num6 + 1;
					array9[num13] = (sbyte)((int)((A_4.lbitWorkArea >> 7) & (long)((ulong)255)));
					break;
				}
				case 4:
				{
					A_4.lbitWorkArea >>= 4;
					byte[] array10 = array7;
					int num6 = A_4.pos;
					int num14 = num6;
					A_4.pos = num6 + 1;
					array10[num14] = (sbyte)((int)((A_4.lbitWorkArea >> 8) & (long)((ulong)255)));
					byte[] array11 = array7;
					num6 = A_4.pos;
					int num15 = num6;
					A_4.pos = num6 + 1;
					array11[num15] = (sbyte)((int)(A_4.lbitWorkArea & (long)((ulong)255)));
					break;
				}
				case 5:
				{
					A_4.lbitWorkArea >>= 1;
					byte[] array12 = array7;
					int num6 = A_4.pos;
					int num16 = num6;
					A_4.pos = num6 + 1;
					array12[num16] = (sbyte)((int)((A_4.lbitWorkArea >> 16) & (long)((ulong)255)));
					byte[] array13 = array7;
					num6 = A_4.pos;
					int num17 = num6;
					A_4.pos = num6 + 1;
					array13[num17] = (sbyte)((int)((A_4.lbitWorkArea >> 8) & (long)((ulong)255)));
					byte[] array14 = array7;
					num6 = A_4.pos;
					int num18 = num6;
					A_4.pos = num6 + 1;
					array14[num18] = (sbyte)((int)(A_4.lbitWorkArea & (long)((ulong)255)));
					break;
				}
				case 6:
				{
					A_4.lbitWorkArea >>= 6;
					byte[] array15 = array7;
					int num6 = A_4.pos;
					int num19 = num6;
					A_4.pos = num6 + 1;
					array15[num19] = (sbyte)((int)((A_4.lbitWorkArea >> 16) & (long)((ulong)255)));
					byte[] array16 = array7;
					num6 = A_4.pos;
					int num20 = num6;
					A_4.pos = num6 + 1;
					array16[num20] = (sbyte)((int)((A_4.lbitWorkArea >> 8) & (long)((ulong)255)));
					byte[] array17 = array7;
					num6 = A_4.pos;
					int num21 = num6;
					A_4.pos = num6 + 1;
					array17[num21] = (sbyte)((int)(A_4.lbitWorkArea & (long)((ulong)255)));
					break;
				}
				case 7:
				{
					A_4.lbitWorkArea >>= 3;
					byte[] array18 = array7;
					int num6 = A_4.pos;
					int num22 = num6;
					A_4.pos = num6 + 1;
					array18[num22] = (sbyte)((int)((A_4.lbitWorkArea >> 24) & (long)((ulong)255)));
					byte[] array19 = array7;
					num6 = A_4.pos;
					int num23 = num6;
					A_4.pos = num6 + 1;
					array19[num23] = (sbyte)((int)((A_4.lbitWorkArea >> 16) & (long)((ulong)255)));
					byte[] array20 = array7;
					num6 = A_4.pos;
					int num24 = num6;
					A_4.pos = num6 + 1;
					array20[num24] = (sbyte)((int)((A_4.lbitWorkArea >> 8) & (long)((ulong)255)));
					byte[] array21 = array7;
					num6 = A_4.pos;
					int num25 = num6;
					A_4.pos = num6 + 1;
					array21[num25] = (sbyte)((int)(A_4.lbitWorkArea & (long)((ulong)255)));
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

		// Token: 0x060000B7 RID: 183 RVA: 0x0000385C File Offset: 0x00001A5C
		[LineNumberTable(new byte[]
		{
			161, 9, 105, 193, 103, 104, 114, 129, 111, 104,
			159, 6, 133, 127, 11, 127, 11, 120, 120, 120,
			120, 120, 120, 133, 127, 12, 127, 11, 127, 11,
			127, 11, 120, 120, 120, 120, 133, 127, 12, 127,
			12, 127, 12, 127, 11, 127, 11, 120, 120, 120,
			133, 127, 12, 127, 12, 127, 12, 127, 12, 127,
			11, 127, 11, 127, 11, 120, 130, 159, 12, 151,
			115, 123, 149, 101, 107, 112, 123, 106, 101, 138,
			116, 109, 127, 13, 127, 13, 127, 13, 127, 13,
			127, 13, 127, 13, 127, 12, 127, 10, 111, 120,
			124, 117, 232, 43, 235, 90
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
					array2[num2] = this.encodeTable[(int)(A_4.lbitWorkArea >> 3) & 31];
					byte[] array3 = array;
					num = A_4.pos;
					int num3 = num;
					A_4.pos = num + 1;
					array3[num3] = this.encodeTable[(int)((int)A_4.lbitWorkArea << 2) & 31];
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
					byte[] array6 = array;
					num = A_4.pos;
					int num6 = num;
					A_4.pos = num + 1;
					array6[num6] = 61;
					byte[] array7 = array;
					num = A_4.pos;
					int num7 = num;
					A_4.pos = num + 1;
					array7[num7] = 61;
					byte[] array8 = array;
					num = A_4.pos;
					int num8 = num;
					A_4.pos = num + 1;
					array8[num8] = 61;
					byte[] array9 = array;
					num = A_4.pos;
					int num9 = num;
					A_4.pos = num + 1;
					array9[num9] = 61;
					break;
				}
				case 2:
				{
					byte[] array10 = array;
					int num = A_4.pos;
					int num10 = num;
					A_4.pos = num + 1;
					array10[num10] = this.encodeTable[(int)(A_4.lbitWorkArea >> 11) & 31];
					byte[] array11 = array;
					num = A_4.pos;
					int num11 = num;
					A_4.pos = num + 1;
					array11[num11] = this.encodeTable[(int)(A_4.lbitWorkArea >> 6) & 31];
					byte[] array12 = array;
					num = A_4.pos;
					int num12 = num;
					A_4.pos = num + 1;
					array12[num12] = this.encodeTable[(int)(A_4.lbitWorkArea >> 1) & 31];
					byte[] array13 = array;
					num = A_4.pos;
					int num13 = num;
					A_4.pos = num + 1;
					array13[num13] = this.encodeTable[(int)((int)A_4.lbitWorkArea << 4) & 31];
					byte[] array14 = array;
					num = A_4.pos;
					int num14 = num;
					A_4.pos = num + 1;
					array14[num14] = 61;
					byte[] array15 = array;
					num = A_4.pos;
					int num15 = num;
					A_4.pos = num + 1;
					array15[num15] = 61;
					byte[] array16 = array;
					num = A_4.pos;
					int num16 = num;
					A_4.pos = num + 1;
					array16[num16] = 61;
					byte[] array17 = array;
					num = A_4.pos;
					int num17 = num;
					A_4.pos = num + 1;
					array17[num17] = 61;
					break;
				}
				case 3:
				{
					byte[] array18 = array;
					int num = A_4.pos;
					int num18 = num;
					A_4.pos = num + 1;
					array18[num18] = this.encodeTable[(int)(A_4.lbitWorkArea >> 19) & 31];
					byte[] array19 = array;
					num = A_4.pos;
					int num19 = num;
					A_4.pos = num + 1;
					array19[num19] = this.encodeTable[(int)(A_4.lbitWorkArea >> 14) & 31];
					byte[] array20 = array;
					num = A_4.pos;
					int num20 = num;
					A_4.pos = num + 1;
					array20[num20] = this.encodeTable[(int)(A_4.lbitWorkArea >> 9) & 31];
					byte[] array21 = array;
					num = A_4.pos;
					int num21 = num;
					A_4.pos = num + 1;
					array21[num21] = this.encodeTable[(int)(A_4.lbitWorkArea >> 4) & 31];
					byte[] array22 = array;
					num = A_4.pos;
					int num22 = num;
					A_4.pos = num + 1;
					array22[num22] = this.encodeTable[(int)((int)A_4.lbitWorkArea << 1) & 31];
					byte[] array23 = array;
					num = A_4.pos;
					int num23 = num;
					A_4.pos = num + 1;
					array23[num23] = 61;
					byte[] array24 = array;
					num = A_4.pos;
					int num24 = num;
					A_4.pos = num + 1;
					array24[num24] = 61;
					byte[] array25 = array;
					num = A_4.pos;
					int num25 = num;
					A_4.pos = num + 1;
					array25[num25] = 61;
					break;
				}
				case 4:
				{
					byte[] array26 = array;
					int num = A_4.pos;
					int num26 = num;
					A_4.pos = num + 1;
					array26[num26] = this.encodeTable[(int)(A_4.lbitWorkArea >> 27) & 31];
					byte[] array27 = array;
					num = A_4.pos;
					int num27 = num;
					A_4.pos = num + 1;
					array27[num27] = this.encodeTable[(int)(A_4.lbitWorkArea >> 22) & 31];
					byte[] array28 = array;
					num = A_4.pos;
					int num28 = num;
					A_4.pos = num + 1;
					array28[num28] = this.encodeTable[(int)(A_4.lbitWorkArea >> 17) & 31];
					byte[] array29 = array;
					num = A_4.pos;
					int num29 = num;
					A_4.pos = num + 1;
					array29[num29] = this.encodeTable[(int)(A_4.lbitWorkArea >> 12) & 31];
					byte[] array30 = array;
					num = A_4.pos;
					int num30 = num;
					A_4.pos = num + 1;
					array30[num30] = this.encodeTable[(int)(A_4.lbitWorkArea >> 7) & 31];
					byte[] array31 = array;
					num = A_4.pos;
					int num31 = num;
					A_4.pos = num + 1;
					array31[num31] = this.encodeTable[(int)(A_4.lbitWorkArea >> 2) & 31];
					byte[] array32 = array;
					num = A_4.pos;
					int num32 = num;
					A_4.pos = num + 1;
					array32[num32] = this.encodeTable[(int)((int)A_4.lbitWorkArea << 3) & 31];
					byte[] array33 = array;
					num = A_4.pos;
					int num33 = num;
					A_4.pos = num + 1;
					array33[num33] = 61;
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
					byte[] array34 = this.ensureBufferSize(this.encodeSize, A_4);
					int num34 = A_4.modulus + 1;
					int num35 = 5;
					A_4.modulus = ((num35 != -1) ? (num34 % num35) : 0);
					int num36 = A_2;
					A_2++;
					int num37 = (int)A_1[num36];
					if (num37 < 0)
					{
						num37 += 256;
					}
					A_4.lbitWorkArea = (A_4.lbitWorkArea << 8) + (long)num37;
					if (0 == A_4.modulus)
					{
						byte[] array35 = array34;
						int num = A_4.pos;
						int num38 = num;
						A_4.pos = num + 1;
						array35[num38] = this.encodeTable[(int)(A_4.lbitWorkArea >> 35) & 31];
						byte[] array36 = array34;
						num = A_4.pos;
						int num39 = num;
						A_4.pos = num + 1;
						array36[num39] = this.encodeTable[(int)(A_4.lbitWorkArea >> 30) & 31];
						byte[] array37 = array34;
						num = A_4.pos;
						int num40 = num;
						A_4.pos = num + 1;
						array37[num40] = this.encodeTable[(int)(A_4.lbitWorkArea >> 25) & 31];
						byte[] array38 = array34;
						num = A_4.pos;
						int num41 = num;
						A_4.pos = num + 1;
						array38[num41] = this.encodeTable[(int)(A_4.lbitWorkArea >> 20) & 31];
						byte[] array39 = array34;
						num = A_4.pos;
						int num42 = num;
						A_4.pos = num + 1;
						array39[num42] = this.encodeTable[(int)(A_4.lbitWorkArea >> 15) & 31];
						byte[] array40 = array34;
						num = A_4.pos;
						int num43 = num;
						A_4.pos = num + 1;
						array40[num43] = this.encodeTable[(int)(A_4.lbitWorkArea >> 10) & 31];
						byte[] array41 = array34;
						num = A_4.pos;
						int num44 = num;
						A_4.pos = num + 1;
						array41[num44] = this.encodeTable[(int)(A_4.lbitWorkArea >> 5) & 31];
						byte[] array42 = array34;
						num = A_4.pos;
						int num45 = num;
						A_4.pos = num + 1;
						array42[num45] = this.encodeTable[(int)A_4.lbitWorkArea & 31];
						A_4.currentLinePos += 8;
						if (this.__<>lineLength > 0 && this.__<>lineLength <= A_4.currentLinePos)
						{
							ByteCodeHelper.arraycopy_primitive_1(this.lineSeparator, 0, array34, A_4.pos, this.lineSeparator.Length);
							A_4.pos += this.lineSeparator.Length;
							A_4.currentLinePos = 0;
						}
					}
				}
			}
		}

		// Token: 0x060000B8 RID: 184 RVA: 0x00003FF4 File Offset: 0x000021F4
		[LineNumberTable(481)]
		public override bool isInAlphabet(byte octet)
		{
			int num = (int)((sbyte)octet);
			return num >= 0 && num < this.decodeTable.Length && (int)this.decodeTable[num] != -1;
		}

		// Token: 0x04000044 RID: 68
		private const int BITS_PER_ENCODED_BYTE = 5;

		// Token: 0x04000045 RID: 69
		private const int BYTES_PER_ENCODED_BLOCK = 8;

		// Token: 0x04000046 RID: 70
		private const int BYTES_PER_UNENCODED_BLOCK = 5;

		// Token: 0x04000047 RID: 71
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] CHUNK_SEPARATOR = new byte[] { 13, 10 };

		// Token: 0x04000048 RID: 72
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
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			63,
			(byte)(-1),
			(byte)(-1),
			26,
			27,
			28,
			29,
			30,
			31,
			(byte)(-1),
			(byte)(-1),
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
			25
		};

		// Token: 0x04000049 RID: 73
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] ENCODE_TABLE = new byte[]
		{
			65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
			75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
			85, 86, 87, 88, 89, 90, 50, 51, 52, 53,
			54, 55
		};

		// Token: 0x0400004A RID: 74
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] HEX_DECODE_TABLE = new byte[]
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
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			63,
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
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
			(byte)(-1),
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
			26,
			27,
			28,
			29,
			30,
			31,
			32
		};

		// Token: 0x0400004B RID: 75
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static byte[] HEX_ENCODE_TABLE = new byte[]
		{
			48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
			65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
			75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
			85, 86
		};

		// Token: 0x0400004C RID: 76
		private const int MASK_5BITS = 31;

		// Token: 0x0400004D RID: 77
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int decodeSize;

		// Token: 0x0400004E RID: 78
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] decodeTable;

		// Token: 0x0400004F RID: 79
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int encodeSize;

		// Token: 0x04000050 RID: 80
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] encodeTable;

		// Token: 0x04000051 RID: 81
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private byte[] lineSeparator;
	}
}
