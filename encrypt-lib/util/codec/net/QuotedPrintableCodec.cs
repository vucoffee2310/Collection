using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.nio.charset;
using java.util;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005C RID: 92
	[Implements(new string[] { "com.edc.classbook.util.codec.BinaryEncoder", "com.edc.classbook.util.codec.BinaryDecoder", "com.edc.classbook.util.codec.StringEncoder", "com.edc.classbook.util.codec.StringDecoder" })]
	public class QuotedPrintableCodec : Object, BinaryEncoder, Encoder, BinaryDecoder, Decoder, StringEncoder, StringDecoder
	{
		// Token: 0x06000317 RID: 791 RVA: 0x000112CB File Offset: 0x0000F4CB
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000318 RID: 792 RVA: 0x000112D0 File Offset: 0x0000F4D0
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[LineNumberTable(new byte[]
		{
			100, 99, 130, 99, 135, 102, 112, 100, 101, 138,
			106, 138, 232, 56, 230, 75
		})]
		[MethodImpl(8)]
		public static byte[] encodeQuotedPrintable(BitSet printable, byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			if (printable == null)
			{
				printable = QuotedPrintableCodec.PRINTABLE_CHARS;
			}
			ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
			int num = bytes.Length;
			for (int i = 0; i < num; i++)
			{
				int num2 = (int)bytes[i];
				int num3 = num2;
				if (num3 < 0)
				{
					num3 = 256 + num3;
				}
				if (printable.get(num3))
				{
					byteArrayOutputStream.write(num3);
				}
				else
				{
					QuotedPrintableCodec.encodeQuotedPrintable(num3, byteArrayOutputStream);
				}
			}
			return byteArrayOutputStream.toByteArray();
		}

		// Token: 0x06000319 RID: 793 RVA: 0x00011340 File Offset: 0x0000F540
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[LineNumberTable(new byte[]
		{
			160, 71, 99, 130, 102, 106, 100, 136, 109, 110,
			191, 7, 2, 98, 178, 231, 53, 233, 78
		})]
		[MethodImpl(8)]
		public static byte[] decodeQuotedPrintable(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
			for (int i = 0; i < bytes.Length; i++)
			{
				int num = (int)bytes[i];
				if (num == 61)
				{
					ArrayIndexOutOfBoundsException ex3;
					try
					{
						i++;
						int num2 = Utils.digit16(bytes[i]);
						i++;
						int num3 = Utils.digit16(bytes[i]);
						byteArrayOutputStream.write((int)((ushort)((num2 << 4) + num3)));
					}
					catch (Exception ex)
					{
						ArrayIndexOutOfBoundsException ex2 = ByteCodeHelper.MapException<ArrayIndexOutOfBoundsException>(ex, ByteCodeHelper.MapFlags.None);
						if (ex2 == null)
						{
							throw;
						}
						ex3 = ex2;
						goto IL_005E;
					}
					goto IL_007F;
					IL_005E:
					ArrayIndexOutOfBoundsException ex4 = ex3;
					string text = "Invalid quoted-printable encoding";
					Exception ex5 = ex4;
					Throwable.__<suppressFillInStackTrace>();
					throw new DecoderException(text, ex5);
				}
				byteArrayOutputStream.write(num);
				IL_007F:;
			}
			return byteArrayOutputStream.toByteArray();
		}

		// Token: 0x0600031A RID: 794 RVA: 0x000113EC File Offset: 0x0000F5EC
		[LineNumberTable(new byte[] { 54, 104, 103 })]
		[MethodImpl(8)]
		public QuotedPrintableCodec(Charset charset)
		{
			this.charset = charset;
		}

		// Token: 0x0600031B RID: 795 RVA: 0x00011408 File Offset: 0x0000F608
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[LineNumberTable(new byte[] { 80, 104, 115, 113, 103, 105 })]
		[MethodImpl(8)]
		private static void encodeQuotedPrintable(int A_0, ByteArrayOutputStream A_1)
		{
			A_1.write(61);
			int num = (int)Character.toUpperCase(Character.forDigit((A_0 >> 4) & 15, 16));
			int num2 = (int)Character.toUpperCase(Character.forDigit(A_0 & 15, 16));
			A_1.write(num);
			A_1.write(num2);
		}

		// Token: 0x0600031C RID: 796 RVA: 0x00011451 File Offset: 0x0000F651
		public virtual Charset getCharset()
		{
			return this.charset;
		}

		// Token: 0x0600031D RID: 797 RVA: 0x00011459 File Offset: 0x0000F659
		[LineNumberTable(new byte[] { 161, 29, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string str, Charset charset)
		{
			if (str == null)
			{
				return null;
			}
			return StringUtils.newStringUsAscii(this.encode(String.instancehelper_getBytes(str, charset)));
		}

		// Token: 0x0600031E RID: 798 RVA: 0x00011474 File Offset: 0x0000F674
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(236)]
		[MethodImpl(8)]
		public virtual byte[] decode(byte[] bytes)
		{
			return QuotedPrintableCodec.decodeQuotedPrintable(bytes);
		}

		// Token: 0x0600031F RID: 799 RVA: 0x0001147E File Offset: 0x0000F67E
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 158, 99, 130 })]
		[MethodImpl(8)]
		public virtual string decode(string str, Charset charset)
		{
			if (str == null)
			{
				return null;
			}
			return String.newhelper(this.decode(StringUtils.getBytesUsAscii(str)), charset);
		}

		// Token: 0x06000320 RID: 800 RVA: 0x00011499 File Offset: 0x0000F699
		[LineNumberTable(218)]
		[MethodImpl(8)]
		public virtual byte[] encode(byte[] bytes)
		{
			return QuotedPrintableCodec.encodeQuotedPrintable(QuotedPrintableCodec.PRINTABLE_CHARS, bytes);
		}

		// Token: 0x06000321 RID: 801 RVA: 0x000114A8 File Offset: 0x0000F6A8
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(255)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.encode(str, this.getCharset());
		}

		// Token: 0x06000322 RID: 802 RVA: 0x000114B9 File Offset: 0x0000F6B9
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(312)]
		[MethodImpl(8)]
		public virtual string decode(string str)
		{
			return this.decode(str, this.getCharset());
		}

		// Token: 0x06000323 RID: 803 RVA: 0x000114CA File Offset: 0x0000F6CA
		[LineNumberTable(new byte[] { 42, 109 })]
		[MethodImpl(8)]
		public QuotedPrintableCodec()
			: this(Charsets.__<>UTF_8)
		{
		}

		// Token: 0x06000324 RID: 804 RVA: 0x000114D9 File Offset: 0x0000F6D9
		[LineNumberTable(new byte[] { 68, 110 })]
		[MethodImpl(8)]
		public QuotedPrintableCodec(string charsetName)
			: this(Charset.forName(charsetName))
		{
		}

		// Token: 0x06000325 RID: 805 RVA: 0x000114E9 File Offset: 0x0000F6E9
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException", "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[] { 160, 179, 99, 130 })]
		[MethodImpl(8)]
		public virtual string decode(string str, string charset)
		{
			if (str == null)
			{
				return null;
			}
			return String.newhelper(this.decode(StringUtils.getBytesUsAscii(str)), charset);
		}

		// Token: 0x06000326 RID: 806 RVA: 0x00011504 File Offset: 0x0000F704
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 213, 99, 98, 104, 116, 104, 143 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (obj == null)
			{
				return null;
			}
			if (obj is byte[])
			{
				return this.encode((byte[])((byte[])obj));
			}
			if (obj is string)
			{
				return this.encode((string)obj);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be quoted-printable encoded")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text);
		}

		// Token: 0x06000327 RID: 807 RVA: 0x00011584 File Offset: 0x0000F784
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 239, 99, 98, 104, 116, 104, 143 })]
		[MethodImpl(8)]
		public virtual object decode(object obj)
		{
			if (obj == null)
			{
				return null;
			}
			if (obj is byte[])
			{
				return this.decode((byte[])((byte[])obj));
			}
			if (obj is string)
			{
				return this.decode((string)obj);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be quoted-printable decoded")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x06000328 RID: 808 RVA: 0x00011601 File Offset: 0x0000F801
		[LineNumberTable(382)]
		[MethodImpl(8)]
		public virtual string getDefaultCharset()
		{
			return this.charset.name();
		}

		// Token: 0x06000329 RID: 809 RVA: 0x00011610 File Offset: 0x0000F810
		[Throws(new string[] { "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[] { 161, 50, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string str, string charset)
		{
			if (str == null)
			{
				return null;
			}
			return StringUtils.newStringUsAscii(this.encode(String.instancehelper_getBytes(str, charset)));
		}

		// Token: 0x0600032A RID: 810 RVA: 0x0001162C File Offset: 0x0000F82C
		[LineNumberTable(new byte[]
		{
			18, 239, 74, 104, 43, 166, 104, 43, 166, 108,
			110
		})]
		static QuotedPrintableCodec()
		{
			for (int i = 33; i <= 60; i++)
			{
				QuotedPrintableCodec.PRINTABLE_CHARS.set(i);
			}
			for (int i = 62; i <= 126; i++)
			{
				QuotedPrintableCodec.PRINTABLE_CHARS.set(i);
			}
			QuotedPrintableCodec.PRINTABLE_CHARS.set(9);
			QuotedPrintableCodec.PRINTABLE_CHARS.set(32);
		}

		// Token: 0x04000139 RID: 313
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Charset charset;

		// Token: 0x0400013A RID: 314
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static BitSet PRINTABLE_CHARS = new BitSet(256);

		// Token: 0x0400013B RID: 315
		private const byte ESCAPE_CHAR = 61;

		// Token: 0x0400013C RID: 316
		private const byte TAB = 9;

		// Token: 0x0400013D RID: 317
		private const byte SPACE = 32;
	}
}
