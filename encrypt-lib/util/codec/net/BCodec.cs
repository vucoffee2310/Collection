using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.nio.charset;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005A RID: 90
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder", "com.edc.classbook.util.codec.StringDecoder" })]
	public class BCodec : RFC1522Codec, StringEncoder, Encoder, StringDecoder, Decoder
	{
		// Token: 0x060002EB RID: 747 RVA: 0x00010BAC File Offset: 0x0000EDAC
		[LineNumberTable(new byte[] { 18, 104, 103 })]
		[MethodImpl(8)]
		public BCodec(Charset charset)
		{
			this.charset = charset;
		}

		// Token: 0x060002EC RID: 748 RVA: 0x00010BC8 File Offset: 0x0000EDC8
		public virtual Charset getCharset()
		{
			return this.charset;
		}

		// Token: 0x060002ED RID: 749 RVA: 0x00010BD0 File Offset: 0x0000EDD0
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 70, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string value, Charset charset)
		{
			if (value == null)
			{
				return null;
			}
			return this.encodeText(value, charset);
		}

		// Token: 0x060002EE RID: 750 RVA: 0x00010BE1 File Offset: 0x0000EDE1
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 109, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string value)
		{
			if (value == null)
			{
				return null;
			}
			return this.encode(value, this.getCharset());
		}

		// Token: 0x060002EF RID: 751 RVA: 0x00010BF8 File Offset: 0x0000EDF8
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 127, 99, 162, 125, 97 })]
		[MethodImpl(8)]
		public virtual string decode(string value)
		{
			if (value == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = this.decodeText(value);
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

		// Token: 0x060002F0 RID: 752 RVA: 0x00010C4C File Offset: 0x0000EE4C
		[LineNumberTable(new byte[] { 6, 109 })]
		[MethodImpl(8)]
		public BCodec()
			: this(Charsets.__<>UTF_8)
		{
		}

		// Token: 0x060002F1 RID: 753 RVA: 0x00010C5B File Offset: 0x0000EE5B
		[LineNumberTable(new byte[] { 33, 110 })]
		[MethodImpl(8)]
		public BCodec(string charsetName)
			: this(Charset.forName(charsetName))
		{
		}

		// Token: 0x060002F2 RID: 754 RVA: 0x00010C6B File Offset: 0x0000EE6B
		protected internal override string getEncoding()
		{
			return "B";
		}

		// Token: 0x060002F3 RID: 755 RVA: 0x00010C72 File Offset: 0x0000EE72
		[LineNumberTable(new byte[] { 43, 99, 130 })]
		[MethodImpl(8)]
		protected internal override byte[] doEncoding(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			return Base64.encodeBase64(bytes);
		}

		// Token: 0x060002F4 RID: 756 RVA: 0x00010C81 File Offset: 0x0000EE81
		[LineNumberTable(new byte[] { 51, 99, 130 })]
		[MethodImpl(8)]
		protected internal override byte[] doDecoding(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			return Base64.decodeBase64(bytes);
		}

		// Token: 0x060002F5 RID: 757 RVA: 0x00010C90 File Offset: 0x0000EE90
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 88, 99, 162, 126, 97 })]
		[MethodImpl(8)]
		public virtual string encode(string value, string charset)
		{
			if (value == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = this.encodeText(value, charset);
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

		// Token: 0x060002F6 RID: 758 RVA: 0x00010CE4 File Offset: 0x0000EEE4
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 84, 99, 98, 104, 143 })]
		[MethodImpl(8)]
		public virtual object encode(object value)
		{
			if (value == null)
			{
				return null;
			}
			if (value is string)
			{
				return this.encode((string)value);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(value).getName()).append(" cannot be encoded using BCodec")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text);
		}

		// Token: 0x060002F7 RID: 759 RVA: 0x00010D48 File Offset: 0x0000EF48
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 108, 99, 98, 104, 143 })]
		[MethodImpl(8)]
		public virtual object decode(object value)
		{
			if (value == null)
			{
				return null;
			}
			if (value is string)
			{
				return this.decode((string)value);
			}
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(value).getName()).append(" cannot be decoded using BCodec")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x060002F8 RID: 760 RVA: 0x00010DA9 File Offset: 0x0000EFA9
		[LineNumberTable(249)]
		[MethodImpl(8)]
		public virtual string getDefaultCharset()
		{
			return this.charset.name();
		}

		// Token: 0x060002F9 RID: 761 RVA: 0x00010DB8 File Offset: 0x0000EFB8
		[HideFromReflection]
		[NameSig("<accessstub>0|encodeText", "(Ljava.lang.String;Ljava.nio.charset.Charset;)Ljava.lang.String;")]
		protected internal new string encodeText(string A_1, Charset A_2)
		{
			return this.encodeText(A_1, A_2);
		}

		// Token: 0x060002FA RID: 762 RVA: 0x00010DC2 File Offset: 0x0000EFC2
		[HideFromJava]
		protected internal string <nonvirtual>0(string A_1, Charset A_2)
		{
			return base.encodeText(A_1, A_2);
		}

		// Token: 0x060002FB RID: 763 RVA: 0x00010DCC File Offset: 0x0000EFCC
		[HideFromReflection]
		[NameSig("<accessstub>1|encodeText", "(Ljava.lang.String;Ljava.lang.String;)Ljava.lang.String;")]
		protected internal new string encodeText(string A_1, string A_2)
		{
			return this.encodeText(A_1, A_2);
		}

		// Token: 0x060002FC RID: 764 RVA: 0x00010DD6 File Offset: 0x0000EFD6
		[HideFromJava]
		protected internal string <nonvirtual>1(string A_1, string A_2)
		{
			return base.encodeText(A_1, A_2);
		}

		// Token: 0x060002FD RID: 765 RVA: 0x00010DE0 File Offset: 0x0000EFE0
		[HideFromReflection]
		[NameSig("<accessstub>2|decodeText", "(Ljava.lang.String;)Ljava.lang.String;")]
		protected internal new string decodeText(string A_1)
		{
			return this.decodeText(A_1);
		}

		// Token: 0x060002FE RID: 766 RVA: 0x00010DE9 File Offset: 0x0000EFE9
		[HideFromJava]
		protected internal string <nonvirtual>2(string A_1)
		{
			return base.decodeText(A_1);
		}

		// Token: 0x0400012D RID: 301
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Charset charset;

		// Token: 0x0400012E RID: 302
		[HideFromReflection]
		protected internal new const char SEP = '?';

		// Token: 0x0400012F RID: 303
		[HideFromReflection]
		protected internal new const string POSTFIX = "?=";

		// Token: 0x04000130 RID: 304
		[HideFromReflection]
		protected internal new const string PREFIX = "=?";
	}
}
