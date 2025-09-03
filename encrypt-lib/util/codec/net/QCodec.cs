using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.nio.charset;
using java.util;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005B RID: 91
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder", "com.edc.classbook.util.codec.StringDecoder" })]
	public class QCodec : RFC1522Codec, StringEncoder, Encoder, StringDecoder, Decoder
	{
		// Token: 0x060002FF RID: 767 RVA: 0x00010DF2 File Offset: 0x0000EFF2
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000300 RID: 768 RVA: 0x00010DF4 File Offset: 0x0000EFF4
		[LineNumberTable(new byte[] { 79, 232, 45, 231, 84, 103 })]
		[MethodImpl(8)]
		public QCodec(Charset charset)
		{
			this.encodeBlanks = false;
			this.charset = charset;
		}

		// Token: 0x06000301 RID: 769 RVA: 0x00010E17 File Offset: 0x0000F017
		public virtual Charset getCharset()
		{
			return this.charset;
		}

		// Token: 0x06000302 RID: 770 RVA: 0x00010E1F File Offset: 0x0000F01F
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 94, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string str, Charset charset)
		{
			if (str == null)
			{
				return null;
			}
			return this.encodeText(str, charset);
		}

		// Token: 0x06000303 RID: 771 RVA: 0x00010E30 File Offset: 0x0000F030
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 133, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			if (str == null)
			{
				return null;
			}
			return this.encode(str, this.getCharset());
		}

		// Token: 0x06000304 RID: 772 RVA: 0x00010E48 File Offset: 0x0000F048
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 151, 99, 162, 125, 97 })]
		[MethodImpl(8)]
		public virtual string decode(string str)
		{
			if (str == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = this.decodeText(str);
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_001E;
			}
			return text;
			IL_001E:
			UnsupportedEncodingException ex3 = ex2;
			string text2 = Throwable.instancehelper_getMessage(ex3);
			Exception ex4 = ex3;
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text2, ex4);
		}

		// Token: 0x06000305 RID: 773 RVA: 0x00010E9C File Offset: 0x0000F09C
		[LineNumberTable(new byte[] { 66, 109 })]
		[MethodImpl(8)]
		public QCodec()
			: this(Charsets.__<>UTF_8)
		{
		}

		// Token: 0x06000306 RID: 774 RVA: 0x00010EAB File Offset: 0x0000F0AB
		[LineNumberTable(new byte[] { 94, 110 })]
		[MethodImpl(8)]
		public QCodec(string charsetName)
			: this(Charset.forName(charsetName))
		{
		}

		// Token: 0x06000307 RID: 775 RVA: 0x00010EBB File Offset: 0x0000F0BB
		protected internal override string getEncoding()
		{
			return "Q";
		}

		// Token: 0x06000308 RID: 776 RVA: 0x00010EC4 File Offset: 0x0000F0C4
		[LineNumberTable(new byte[] { 104, 99, 130, 108, 104, 103, 103, 5, 230, 70 })]
		[MethodImpl(8)]
		protected internal override byte[] doEncoding(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			byte[] array = QuotedPrintableCodec.encodeQuotedPrintable(QCodec.PRINTABLE_CHARS, bytes);
			if (this.encodeBlanks)
			{
				for (int i = 0; i < array.Length; i++)
				{
					if (array[i] == 32)
					{
						array[i] = 95;
					}
				}
			}
			return array;
		}

		// Token: 0x06000309 RID: 777 RVA: 0x00010F04 File Offset: 0x0000F104
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[]
		{
			120, 99, 130, 98, 112, 102, 98, 226, 61, 230,
			70, 99, 104, 103, 100, 101, 134, 229, 59, 230,
			72, 137
		})]
		[MethodImpl(8)]
		protected internal override byte[] doDecoding(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			int num = 0;
			int i = bytes.Length;
			for (int j = 0; j < i; j++)
			{
				int num2 = (int)bytes[j];
				if (num2 == 95)
				{
					num = 1;
					break;
				}
			}
			if (num != 0)
			{
				byte[] array = new byte[bytes.Length];
				for (i = 0; i < bytes.Length; i++)
				{
					int j = (int)bytes[i];
					if (j != 95)
					{
						array[i] = (byte)j;
					}
					else
					{
						array[i] = 32;
					}
				}
				return QuotedPrintableCodec.decodeQuotedPrintable(array);
			}
			return QuotedPrintableCodec.decodeQuotedPrintable(bytes);
		}

		// Token: 0x0600030A RID: 778 RVA: 0x00010F78 File Offset: 0x0000F178
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 112, 99, 162, 126, 97 })]
		[MethodImpl(8)]
		public virtual string encode(string str, string charset)
		{
			if (str == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = this.encodeText(str, charset);
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_001F;
			}
			return text;
			IL_001F:
			UnsupportedEncodingException ex3 = ex2;
			string text2 = Throwable.instancehelper_getMessage(ex3);
			Exception ex4 = ex3;
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text2, ex4);
		}

		// Token: 0x0600030B RID: 779 RVA: 0x00010FCC File Offset: 0x0000F1CC
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 172, 99, 98, 104, 143 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (obj == null)
			{
				return null;
			}
			if (obj is string)
			{
				return this.encode((string)obj);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be encoded using Q codec")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text);
		}

		// Token: 0x0600030C RID: 780 RVA: 0x00011030 File Offset: 0x0000F230
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 196, 99, 98, 104, 143 })]
		[MethodImpl(8)]
		public virtual object decode(object obj)
		{
			if (obj == null)
			{
				return null;
			}
			if (obj is string)
			{
				return this.decode((string)obj);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be decoded using Q codec")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x0600030D RID: 781 RVA: 0x00011091 File Offset: 0x0000F291
		[LineNumberTable(337)]
		[MethodImpl(8)]
		public virtual string getDefaultCharset()
		{
			return this.charset.name();
		}

		// Token: 0x0600030E RID: 782 RVA: 0x000110A0 File Offset: 0x0000F2A0
		public virtual bool isEncodeBlanks()
		{
			return this.encodeBlanks;
		}

		// Token: 0x0600030F RID: 783 RVA: 0x000110A8 File Offset: 0x0000F2A8
		public virtual void setEncodeBlanks(bool b)
		{
			this.encodeBlanks = b;
		}

		// Token: 0x06000310 RID: 784 RVA: 0x000110C0 File Offset: 0x0000F2C0
		[LineNumberTable(new byte[]
		{
			11, 207, 108, 108, 108, 108, 108, 108, 108, 108,
			108, 108, 108, 108, 108, 108, 108, 108, 104, 43,
			166, 108, 108, 108, 108, 108, 104, 43, 166, 108,
			108, 108, 108, 108, 104, 43, 166, 108, 108, 108,
			110
		})]
		static QCodec()
		{
			QCodec.PRINTABLE_CHARS.set(32);
			QCodec.PRINTABLE_CHARS.set(33);
			QCodec.PRINTABLE_CHARS.set(34);
			QCodec.PRINTABLE_CHARS.set(35);
			QCodec.PRINTABLE_CHARS.set(36);
			QCodec.PRINTABLE_CHARS.set(37);
			QCodec.PRINTABLE_CHARS.set(38);
			QCodec.PRINTABLE_CHARS.set(39);
			QCodec.PRINTABLE_CHARS.set(40);
			QCodec.PRINTABLE_CHARS.set(41);
			QCodec.PRINTABLE_CHARS.set(42);
			QCodec.PRINTABLE_CHARS.set(43);
			QCodec.PRINTABLE_CHARS.set(44);
			QCodec.PRINTABLE_CHARS.set(45);
			QCodec.PRINTABLE_CHARS.set(46);
			QCodec.PRINTABLE_CHARS.set(47);
			for (int i = 48; i <= 57; i++)
			{
				QCodec.PRINTABLE_CHARS.set(i);
			}
			QCodec.PRINTABLE_CHARS.set(58);
			QCodec.PRINTABLE_CHARS.set(59);
			QCodec.PRINTABLE_CHARS.set(60);
			QCodec.PRINTABLE_CHARS.set(62);
			QCodec.PRINTABLE_CHARS.set(64);
			for (int i = 65; i <= 90; i++)
			{
				QCodec.PRINTABLE_CHARS.set(i);
			}
			QCodec.PRINTABLE_CHARS.set(91);
			QCodec.PRINTABLE_CHARS.set(92);
			QCodec.PRINTABLE_CHARS.set(93);
			QCodec.PRINTABLE_CHARS.set(94);
			QCodec.PRINTABLE_CHARS.set(96);
			for (int i = 97; i <= 122; i++)
			{
				QCodec.PRINTABLE_CHARS.set(i);
			}
			QCodec.PRINTABLE_CHARS.set(123);
			QCodec.PRINTABLE_CHARS.set(124);
			QCodec.PRINTABLE_CHARS.set(125);
			QCodec.PRINTABLE_CHARS.set(126);
		}

		// Token: 0x06000311 RID: 785 RVA: 0x00011291 File Offset: 0x0000F491
		[HideFromReflection]
		[NameSig("<accessstub>0|encodeText", "(Ljava.lang.String;Ljava.nio.charset.Charset;)Ljava.lang.String;")]
		protected internal new string encodeText(string A_1, Charset A_2)
		{
			return this.encodeText(A_1, A_2);
		}

		// Token: 0x06000312 RID: 786 RVA: 0x0001129B File Offset: 0x0000F49B
		[HideFromJava]
		protected internal string <nonvirtual>0(string A_1, Charset A_2)
		{
			return base.encodeText(A_1, A_2);
		}

		// Token: 0x06000313 RID: 787 RVA: 0x000112A5 File Offset: 0x0000F4A5
		[HideFromReflection]
		[NameSig("<accessstub>1|encodeText", "(Ljava.lang.String;Ljava.lang.String;)Ljava.lang.String;")]
		protected internal new string encodeText(string A_1, string A_2)
		{
			return this.encodeText(A_1, A_2);
		}

		// Token: 0x06000314 RID: 788 RVA: 0x000112AF File Offset: 0x0000F4AF
		[HideFromJava]
		protected internal string <nonvirtual>1(string A_1, string A_2)
		{
			return base.encodeText(A_1, A_2);
		}

		// Token: 0x06000315 RID: 789 RVA: 0x000112B9 File Offset: 0x0000F4B9
		[HideFromReflection]
		[NameSig("<accessstub>2|decodeText", "(Ljava.lang.String;)Ljava.lang.String;")]
		protected internal new string decodeText(string A_1)
		{
			return this.decodeText(A_1);
		}

		// Token: 0x06000316 RID: 790 RVA: 0x000112C2 File Offset: 0x0000F4C2
		[HideFromJava]
		protected internal string <nonvirtual>2(string A_1)
		{
			return base.decodeText(A_1);
		}

		// Token: 0x04000131 RID: 305
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Charset charset;

		// Token: 0x04000132 RID: 306
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static BitSet PRINTABLE_CHARS = new BitSet(256);

		// Token: 0x04000133 RID: 307
		private const byte BLANK = 32;

		// Token: 0x04000134 RID: 308
		private const byte UNDERSCORE = 95;

		// Token: 0x04000135 RID: 309
		private bool encodeBlanks;

		// Token: 0x04000136 RID: 310
		[HideFromReflection]
		protected internal new const char SEP = '?';

		// Token: 0x04000137 RID: 311
		[HideFromReflection]
		protected internal new const string POSTFIX = "?=";

		// Token: 0x04000138 RID: 312
		[HideFromReflection]
		protected internal new const string PREFIX = "=?";
	}
}
