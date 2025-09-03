using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005E RID: 94
	[Implements(new string[] { "com.edc.classbook.util.codec.BinaryEncoder", "com.edc.classbook.util.codec.BinaryDecoder", "com.edc.classbook.util.codec.StringEncoder", "com.edc.classbook.util.codec.StringDecoder" })]
	public class URLCodec : Object, BinaryEncoder, Encoder, BinaryDecoder, Decoder, StringEncoder, StringDecoder
	{
		// Token: 0x06000332 RID: 818 RVA: 0x00011694 File Offset: 0x0000F894
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000333 RID: 819 RVA: 0x00011698 File Offset: 0x0000F898
		[LineNumberTable(new byte[] { 58, 104, 103 })]
		[MethodImpl(8)]
		public URLCodec(string charset)
		{
			this.charset = charset;
		}

		// Token: 0x06000334 RID: 820 RVA: 0x000116B4 File Offset: 0x0000F8B4
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[LineNumberTable(new byte[]
		{
			72, 99, 130, 99, 167, 102, 115, 100, 101, 138,
			106, 102, 132, 138, 104, 117, 115, 104, 232, 49,
			233, 82
		})]
		[MethodImpl(8)]
		public static byte[] encodeUrl(BitSet urlsafe, byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			if (urlsafe == null)
			{
				urlsafe = URLCodec.__<>WWW_FORM_URL;
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
				if (urlsafe.get(num3))
				{
					if (num3 == 32)
					{
						num3 = 43;
					}
					byteArrayOutputStream.write(num3);
				}
				else
				{
					byteArrayOutputStream.write(37);
					int num4 = (int)Character.toUpperCase(Character.forDigit((num3 >> 4) & 15, 16));
					int num5 = (int)Character.toUpperCase(Character.forDigit(num3 & 15, 16));
					byteArrayOutputStream.write(num4);
					byteArrayOutputStream.write(num5);
				}
			}
			return byteArrayOutputStream.toByteArray();
		}

		// Token: 0x06000335 RID: 821 RVA: 0x0001176C File Offset: 0x0000F96C
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[LineNumberTable(new byte[]
		{
			112, 99, 130, 102, 106, 100, 101, 109, 136, 109,
			110, 191, 7, 2, 98, 178, 231, 51, 233, 80
		})]
		[MethodImpl(8)]
		public static byte[] decodeUrl(byte[] bytes)
		{
			if (bytes == null)
			{
				return null;
			}
			ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
			for (int i = 0; i < bytes.Length; i++)
			{
				int num = (int)bytes[i];
				if (num == 43)
				{
					byteArrayOutputStream.write(32);
				}
				else if (num == 37)
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
						goto IL_0070;
					}
					goto IL_006E;
					IL_0070:
					ArrayIndexOutOfBoundsException ex4 = ex3;
					string text = "Invalid URL encoding: ";
					Exception ex5 = ex4;
					Throwable.__<suppressFillInStackTrace>();
					throw new DecoderException(text, ex5);
					IL_006E:;
				}
				else
				{
					byteArrayOutputStream.write(num);
				}
			}
			return byteArrayOutputStream.toByteArray();
		}

		// Token: 0x06000336 RID: 822 RVA: 0x0001182C File Offset: 0x0000FA2C
		[LineNumberTable(194)]
		[MethodImpl(8)]
		public virtual byte[] encode(byte[] bytes)
		{
			return URLCodec.encodeUrl(URLCodec.__<>WWW_FORM_URL, bytes);
		}

		// Token: 0x06000337 RID: 823 RVA: 0x0001183B File Offset: 0x0000FA3B
		public virtual string getDefaultCharset()
		{
			return this.charset;
		}

		// Token: 0x06000338 RID: 824 RVA: 0x00011843 File Offset: 0x0000FA43
		[Throws(new string[] { "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[] { 160, 111, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string str, string charset)
		{
			if (str == null)
			{
				return null;
			}
			return StringUtils.newStringUsAscii(this.encode(String.instancehelper_getBytes(str, charset)));
		}

		// Token: 0x06000339 RID: 825 RVA: 0x0001185E File Offset: 0x0000FA5E
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(210)]
		[MethodImpl(8)]
		public virtual byte[] decode(byte[] bytes)
		{
			return URLCodec.decodeUrl(bytes);
		}

		// Token: 0x0600033A RID: 826 RVA: 0x00011868 File Offset: 0x0000FA68
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException", "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[] { 160, 156, 99, 130 })]
		[MethodImpl(8)]
		public virtual string decode(string str, string charset)
		{
			if (str == null)
			{
				return null;
			}
			return String.newhelper(this.decode(StringUtils.getBytesUsAscii(str)), charset);
		}

		// Token: 0x0600033B RID: 827 RVA: 0x00011884 File Offset: 0x0000FA84
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 130, 99, 162, 127, 4, 97 })]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			if (str == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = this.encode(str, this.getDefaultCharset());
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_0024;
			}
			return text;
			IL_0024:
			UnsupportedEncodingException ex3 = ex2;
			string text2 = Throwable.instancehelper_getMessage(ex3);
			Exception ex4 = ex3;
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text2, ex4);
		}

		// Token: 0x0600033C RID: 828 RVA: 0x000118DC File Offset: 0x0000FADC
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 175, 99, 162, 127, 4, 97 })]
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
				text = this.decode(str, this.getDefaultCharset());
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_0024;
			}
			return text;
			IL_0024:
			UnsupportedEncodingException ex3 = ex2;
			string text2 = Throwable.instancehelper_getMessage(ex3);
			Exception ex4 = ex3;
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text2, ex4);
		}

		// Token: 0x0600033D RID: 829 RVA: 0x00011934 File Offset: 0x0000FB34
		[LineNumberTable(new byte[] { 49, 109 })]
		[MethodImpl(8)]
		public URLCodec()
			: this("UTF-8")
		{
		}

		// Token: 0x0600033E RID: 830 RVA: 0x00011944 File Offset: 0x0000FB44
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 196, 99, 98, 104, 116, 104, 143 })]
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
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be URL encoded")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text);
		}

		// Token: 0x0600033F RID: 831 RVA: 0x000119C4 File Offset: 0x0000FBC4
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 221, 99, 98, 104, 116, 104, 143 })]
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
			string text = new StringBuilder().append("Objects of type ").append(Object.instancehelper_getClass(obj).getName()).append(" cannot be URL decoded")
				.toString();
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text);
		}

		// Token: 0x06000340 RID: 832 RVA: 0x00011A41 File Offset: 0x0000FC41
		[Obsolete]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		public virtual string getEncoding()
		{
			return this.charset;
		}

		// Token: 0x06000341 RID: 833 RVA: 0x00011A4C File Offset: 0x0000FC4C
		[LineNumberTable(new byte[]
		{
			20, 239, 69, 104, 43, 166, 104, 43, 198, 104,
			43, 198, 108, 108, 108, 140, 110
		})]
		static URLCodec()
		{
			for (int i = 97; i <= 122; i++)
			{
				URLCodec.__<>WWW_FORM_URL.set(i);
			}
			for (int i = 65; i <= 90; i++)
			{
				URLCodec.__<>WWW_FORM_URL.set(i);
			}
			for (int i = 48; i <= 57; i++)
			{
				URLCodec.__<>WWW_FORM_URL.set(i);
			}
			URLCodec.__<>WWW_FORM_URL.set(45);
			URLCodec.__<>WWW_FORM_URL.set(95);
			URLCodec.__<>WWW_FORM_URL.set(46);
			URLCodec.__<>WWW_FORM_URL.set(42);
			URLCodec.__<>WWW_FORM_URL.set(32);
		}

		// Token: 0x17000016 RID: 22
		// (get) Token: 0x06000342 RID: 834 RVA: 0x00011AF1 File Offset: 0x0000FCF1
		[Modifiers(Modifiers.Protected | Modifiers.Static | Modifiers.Final)]
		protected internal static BitSet WWW_FORM_URL
		{
			[HideFromJava]
			get
			{
				return URLCodec.__<>WWW_FORM_URL;
			}
		}

		// Token: 0x04000141 RID: 321
		internal const int RADIX = 16;

		// Token: 0x04000142 RID: 322
		[Obsolete]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		protected internal string charset;

		// Token: 0x04000143 RID: 323
		protected internal const byte ESCAPE_CHAR = 37;

		// Token: 0x04000144 RID: 324
		internal static BitSet __<>WWW_FORM_URL = new BitSet(256);
	}
}
