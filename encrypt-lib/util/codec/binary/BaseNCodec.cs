using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x0200001A RID: 26
	[Implements(new string[] { "com.edc.classbook.util.codec.BinaryEncoder", "com.edc.classbook.util.codec.BinaryDecoder" })]
	public abstract class BaseNCodec : Object, BinaryEncoder, Encoder, BinaryDecoder, Decoder
	{
		// Token: 0x060000E2 RID: 226 RVA: 0x00002DAD File Offset: 0x00000FAD
		protected internal virtual int getDefaultBufferSize()
		{
			return 8192;
		}

		// Token: 0x060000E3 RID: 227 RVA: 0x00002DB4 File Offset: 0x00000FB4
		[LineNumberTable(new byte[] { 160, 110, 104, 113, 103, 137, 111, 117, 135 })]
		[MethodImpl(8)]
		private byte[] resizeBuffer(BaseNCodec.Context A_1)
		{
			if (A_1.buffer == null)
			{
				A_1.buffer = new byte[this.getDefaultBufferSize()];
				A_1.pos = 0;
				A_1.readPos = 0;
			}
			else
			{
				byte[] array = new byte[A_1.buffer.Length * 2];
				ByteCodeHelper.arraycopy_primitive_1(A_1.buffer, 0, array, 0, A_1.buffer.Length);
				A_1.buffer = array;
			}
			return A_1.buffer;
		}

		// Token: 0x060000E4 RID: 228 RVA: 0x00002E1B File Offset: 0x0000101B
		[LineNumberTable(207)]
		internal virtual int available(BaseNCodec.Context A_1)
		{
			return (A_1.buffer == null) ? 0 : (A_1.pos - A_1.readPos);
		}

		// Token: 0x060000E5 RID: 229 RVA: 0x00002E38 File Offset: 0x00001038
		[LineNumberTable(new byte[] { 161, 30, 103, 130, 102, 107, 106, 115, 108 })]
		[MethodImpl(8)]
		public virtual byte[] encode(byte[] pArray)
		{
			if (pArray == null || pArray.Length == 0)
			{
				return pArray;
			}
			BaseNCodec.Context context = new BaseNCodec.Context();
			this.encode(pArray, 0, pArray.Length, context);
			this.encode(pArray, 0, -1, context);
			byte[] array = new byte[context.pos - context.readPos];
			this.readResults(array, 0, array.Length, context);
			return array;
		}

		// Token: 0x060000E6 RID: 230 RVA: 0x00002E8C File Offset: 0x0000108C
		[LineNumberTable(new byte[] { 161, 10, 103, 130, 102, 107, 106, 108, 108 })]
		[MethodImpl(8)]
		public virtual byte[] decode(byte[] pArray)
		{
			if (pArray == null || pArray.Length == 0)
			{
				return pArray;
			}
			BaseNCodec.Context context = new BaseNCodec.Context();
			this.decode(pArray, 0, pArray.Length, context);
			this.decode(pArray, 0, -1, context);
			byte[] array = new byte[context.pos];
			this.readResults(array, 0, array.Length, context);
			return array;
		}

		// Token: 0x060000E7 RID: 231 RVA: 0x00002ED6 File Offset: 0x000010D6
		[LineNumberTable(368)]
		[MethodImpl(8)]
		public virtual byte[] decode(string pArray)
		{
			return this.decode(StringUtils.getBytesUtf8(pArray));
		}

		// Token: 0x060000E8 RID: 232 RVA: 0x00002EE6 File Offset: 0x000010E6
		[Modifiers(Modifiers.Abstract)]
		internal virtual void decode(byte[] A_1, int A_2, int A_3, BaseNCodec.Context A_4)
		{
			throw new AbstractMethodError("com.edc.classbook.util.codec.binary.BaseNCodec.decode([BIILcom.edc.classbook.util.codec.binary.BaseNCodec$Context;)V");
		}

		// Token: 0x060000E9 RID: 233 RVA: 0x00002EF4 File Offset: 0x000010F4
		[LineNumberTable(new byte[] { 160, 152, 105, 111, 118, 111, 112, 136, 130 })]
		[MethodImpl(8)]
		internal virtual int readResults(byte[] A_1, int A_2, int A_3, BaseNCodec.Context A_4)
		{
			if (A_4.buffer != null)
			{
				int num = Math.min(this.available(A_4), A_3);
				ByteCodeHelper.arraycopy_primitive_1(A_4.buffer, A_4.readPos, A_1, A_2, num);
				A_4.readPos += num;
				if (A_4.readPos >= A_4.pos)
				{
					A_4.buffer = null;
				}
				return num;
			}
			return (!A_4.eof) ? 0 : (-1);
		}

		// Token: 0x060000EA RID: 234 RVA: 0x00002F65 File Offset: 0x00001165
		[Modifiers(Modifiers.Abstract)]
		internal virtual void encode(byte[] A_1, int A_2, int A_3, BaseNCodec.Context A_4)
		{
			throw new AbstractMethodError("com.edc.classbook.util.codec.binary.BaseNCodec.encode([BIILcom.edc.classbook.util.codec.binary.BaseNCodec$Context;)V");
		}

		// Token: 0x060000EB RID: 235
		protected internal abstract bool isInAlphabet(byte b);

		// Token: 0x060000EC RID: 236 RVA: 0x00002F74 File Offset: 0x00001174
		protected internal static bool isWhiteSpace(byte byteToCheck)
		{
			int num = (int)((sbyte)byteToCheck);
			int num2 = num;
			if (num2 != 9)
			{
				if (num2 != 10)
				{
					if (num2 != 13)
					{
						if (num2 != 32)
						{
							return false;
						}
					}
				}
			}
			return true;
		}

		// Token: 0x060000ED RID: 237 RVA: 0x00002FAC File Offset: 0x000011AC
		[LineNumberTable(new byte[] { 159, 33, 130, 103, 159, 0, 226, 61, 230, 70 })]
		[MethodImpl(8)]
		public virtual bool isInAlphabet(byte[] arrayOctet, bool allowWSPad)
		{
			for (int i = 0; i < arrayOctet.Length; i++)
			{
				if (!this.isInAlphabet(arrayOctet[i]) && (!allowWSPad || (arrayOctet[i] != 61 && !BaseNCodec.isWhiteSpace(arrayOctet[i]))))
				{
					return false;
				}
			}
			return true;
		}

		// Token: 0x060000EE RID: 238 RVA: 0x00002FEC File Offset: 0x000011EC
		[LineNumberTable(new byte[]
		{
			160, 68, 232, 36, 232, 93, 103, 103, 110, 121,
			104
		})]
		[MethodImpl(8)]
		protected internal BaseNCodec(int unencodedBlockSize, int encodedBlockSize, int lineLength, int chunkSeparatorLength)
		{
			this.__<>PAD = 61;
			this.unencodedBlockSize = unencodedBlockSize;
			this.encodedBlockSize = encodedBlockSize;
			int num = ((lineLength <= 0 || chunkSeparatorLength <= 0) ? 0 : 1);
			this.__<>lineLength = ((num == 0) ? 0 : (((encodedBlockSize != -1) ? (lineLength / encodedBlockSize) : (-lineLength)) * encodedBlockSize));
			this.chunkSeparatorLength = chunkSeparatorLength;
		}

		// Token: 0x060000EF RID: 239 RVA: 0x00003046 File Offset: 0x00001246
		[LineNumberTable(197)]
		internal virtual bool hasData(BaseNCodec.Context A_1)
		{
			return A_1.buffer != null;
		}

		// Token: 0x060000F0 RID: 240 RVA: 0x00003054 File Offset: 0x00001254
		[LineNumberTable(new byte[] { 160, 129, 121, 138 })]
		[MethodImpl(8)]
		protected internal virtual byte[] ensureBufferSize(int size, BaseNCodec.Context context)
		{
			if (context.buffer == null || context.buffer.Length < context.pos + size)
			{
				return this.resizeBuffer(context);
			}
			return context.buffer;
		}

		// Token: 0x060000F1 RID: 241 RVA: 0x0000307F File Offset: 0x0000127F
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 195, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is byte[]))
			{
				string text = "Parameter supplied to Base-N encode is not a byte[]";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.encode((byte[])((byte[])obj));
		}

		// Token: 0x060000F2 RID: 242 RVA: 0x000030AC File Offset: 0x000012AC
		[LineNumberTable(324)]
		[MethodImpl(8)]
		public virtual string encodeToString(byte[] pArray)
		{
			return StringUtils.newStringUtf8(this.encode(pArray));
		}

		// Token: 0x060000F3 RID: 243 RVA: 0x000030BC File Offset: 0x000012BC
		[LineNumberTable(335)]
		[MethodImpl(8)]
		public virtual string encodeAsString(byte[] pArray)
		{
			return StringUtils.newStringUtf8(this.encode(pArray));
		}

		// Token: 0x060000F4 RID: 244 RVA: 0x000030CC File Offset: 0x000012CC
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 237, 104, 116, 104, 143 })]
		[MethodImpl(8)]
		public virtual object decode(object obj)
		{
			if (obj is byte[])
			{
				return this.decode((byte[])((byte[])obj));
			}
			if (obj is string)
			{
				return this.decode((string)obj);
			}
			string text = "Parameter supplied to Base-N decode is not a byte[] or a String";
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x060000F5 RID: 245 RVA: 0x0000311B File Offset: 0x0000131B
		[LineNumberTable(457)]
		[MethodImpl(8)]
		public virtual bool isInAlphabet(string basen)
		{
			return this.isInAlphabet(StringUtils.getBytesUtf8(basen), true);
		}

		// Token: 0x060000F6 RID: 246 RVA: 0x0000312C File Offset: 0x0000132C
		[LineNumberTable(new byte[] { 161, 100, 99, 130, 111, 110, 2, 230, 69 })]
		[MethodImpl(8)]
		protected internal virtual bool containsAlphabetOrPad(byte[] arrayOctet)
		{
			if (arrayOctet == null)
			{
				return false;
			}
			int num = arrayOctet.Length;
			for (int i = 0; i < num; i++)
			{
				int num2 = (int)arrayOctet[i];
				if (61 == num2 || this.isInAlphabet((byte)num2))
				{
					return true;
				}
			}
			return false;
		}

		// Token: 0x060000F7 RID: 247 RVA: 0x00003164 File Offset: 0x00001364
		[LineNumberTable(new byte[] { 161, 122, 127, 5, 137, 159, 9 })]
		public virtual long getEncodedLength(byte[] pArray)
		{
			int num = pArray.Length + this.unencodedBlockSize - 1;
			int num2 = this.unencodedBlockSize;
			long num3 = (long)((num2 != -1) ? (num / num2) : (-(long)num)) * (long)this.encodedBlockSize;
			if (this.__<>lineLength > 0)
			{
				long num4 = num3;
				long num5 = num3 + (long)this.__<>lineLength - 1L;
				long num6 = (long)this.__<>lineLength;
				num3 = num4 + ((num6 != -1L) ? (num5 / num6) : (-num5)) * (long)this.chunkSeparatorLength;
			}
			return num3;
		}

		// Token: 0x17000007 RID: 7
		// (get) Token: 0x060000F8 RID: 248 RVA: 0x000031C7 File Offset: 0x000013C7
		// (set) Token: 0x060000F9 RID: 249 RVA: 0x000031CF File Offset: 0x000013CF
		[Modifiers(Modifiers.Protected | Modifiers.Final)]
		protected internal byte PAD
		{
			[HideFromJava]
			get
			{
				return this.__<>PAD;
			}
			[HideFromJava]
			private set
			{
				this.__<>PAD = value;
			}
		}

		// Token: 0x17000008 RID: 8
		// (get) Token: 0x060000FA RID: 250 RVA: 0x000031D8 File Offset: 0x000013D8
		// (set) Token: 0x060000FB RID: 251 RVA: 0x000031E0 File Offset: 0x000013E0
		[Modifiers(Modifiers.Protected | Modifiers.Final)]
		protected internal int lineLength
		{
			[HideFromJava]
			get
			{
				return this.__<>lineLength;
			}
			[HideFromJava]
			private set
			{
				this.__<>lineLength = value;
			}
		}

		// Token: 0x060000FC RID: 252 RVA: 0x000031E9 File Offset: 0x000013E9
		[HideFromJava]
		[NameSig("ensureBufferSize", "(ILcom.edc.classbook.util.codec.binary.BaseNCodec$Context;)[B")]
		protected internal byte[] ensureBufferSize(int A_1, object A_2)
		{
			return this.ensureBufferSize(A_1, (BaseNCodec.Context)A_2);
		}

		// Token: 0x060000FD RID: 253 RVA: 0x000031F8 File Offset: 0x000013F8
		[HideFromJava]
		[NameSig("ensureBufferSize", "(ILcom.edc.classbook.util.codec.binary.BaseNCodec$Context;)[B")]
		protected internal byte[] <nonvirtual>0(int A_1, object A_2)
		{
			return this.ensureBufferSize(A_1, (BaseNCodec.Context)A_2);
		}

		// Token: 0x0400005F RID: 95
		internal const int EOF = -1;

		// Token: 0x04000060 RID: 96
		public const int MIME_CHUNK_SIZE = 76;

		// Token: 0x04000061 RID: 97
		public const int PEM_CHUNK_SIZE = 64;

		// Token: 0x04000062 RID: 98
		private const int DEFAULT_BUFFER_RESIZE_FACTOR = 2;

		// Token: 0x04000063 RID: 99
		private const int DEFAULT_BUFFER_SIZE = 8192;

		// Token: 0x04000064 RID: 100
		protected internal const int MASK_8BITS = 255;

		// Token: 0x04000065 RID: 101
		protected internal const byte PAD_DEFAULT = 61;

		// Token: 0x04000066 RID: 102
		internal byte __<>PAD;

		// Token: 0x04000067 RID: 103
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int unencodedBlockSize;

		// Token: 0x04000068 RID: 104
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int encodedBlockSize;

		// Token: 0x04000069 RID: 105
		internal int __<>lineLength;

		// Token: 0x0400006A RID: 106
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int chunkSeparatorLength;

		// Token: 0x0200001B RID: 27
		[InnerClass(null, Modifiers.Static)]
		[SourceFile("BaseNCodec.java")]
		[Modifiers(Modifiers.Super)]
		internal sealed class Context : Object
		{
			// Token: 0x060000FE RID: 254 RVA: 0x00005A11 File Offset: 0x00003C11
			[LineNumberTable(new byte[] { 40, 104 })]
			[MethodImpl(8)]
			internal Context()
			{
			}

			// Token: 0x060000FF RID: 255 RVA: 0x00005A1C File Offset: 0x00003C1C
			[LineNumberTable(101)]
			[MethodImpl(8)]
			public override string toString()
			{
				return String.format("%s[buffer=%s, currentLinePos=%s, eof=%s, ibitWorkArea=%s, lbitWorkArea=%s, modulus=%s, pos=%s, readPos=%s]", new object[]
				{
					Object.instancehelper_getClass(this).getSimpleName(),
					this.buffer,
					Integer.valueOf(this.currentLinePos),
					Boolean.valueOf(this.eof),
					Integer.valueOf(this.ibitWorkArea),
					Long.valueOf(this.lbitWorkArea),
					Integer.valueOf(this.modulus),
					Integer.valueOf(this.pos),
					Integer.valueOf(this.readPos)
				});
			}

			// Token: 0x0400006B RID: 107
			internal int ibitWorkArea;

			// Token: 0x0400006C RID: 108
			internal long lbitWorkArea;

			// Token: 0x0400006D RID: 109
			internal byte[] buffer;

			// Token: 0x0400006E RID: 110
			internal int pos;

			// Token: 0x0400006F RID: 111
			internal int readPos;

			// Token: 0x04000070 RID: 112
			internal bool eof;

			// Token: 0x04000071 RID: 113
			internal int currentLinePos;

			// Token: 0x04000072 RID: 114
			internal int modulus;
		}
	}
}
