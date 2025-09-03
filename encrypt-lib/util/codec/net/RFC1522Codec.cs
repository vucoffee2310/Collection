using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using java.lang;
using java.nio.charset;

namespace com.edc.classbook.util.codec.net
{
	// Token: 0x0200005D RID: 93
	internal abstract class RFC1522Codec : Object
	{
		// Token: 0x0600032B RID: 811
		protected internal abstract string getEncoding();

		// Token: 0x0600032C RID: 812
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		protected internal abstract byte[] doEncoding(byte[]);

		// Token: 0x0600032D RID: 813 RVA: 0x000109E8 File Offset: 0x0000EBE8
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[]
		{
			19, 99, 130, 102, 108, 104, 105, 109, 105, 110,
			109, 108
		})]
		[MethodImpl(8)]
		protected internal virtual string encodeText(string A_1, Charset A_2)
		{
			if (A_1 == null)
			{
				return null;
			}
			StringBuilder stringBuilder = new StringBuilder();
			stringBuilder.append("=?");
			stringBuilder.append(A_2);
			stringBuilder.append('?');
			stringBuilder.append(this.getEncoding());
			stringBuilder.append('?');
			byte[] array = this.doEncoding(String.instancehelper_getBytes(A_1, A_2));
			stringBuilder.append(StringUtils.newStringUsAscii(array));
			stringBuilder.append("?=");
			return stringBuilder.toString();
		}

		// Token: 0x0600032E RID: 814
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		protected internal abstract byte[] doDecoding(byte[]);

		// Token: 0x0600032F RID: 815 RVA: 0x00010A62 File Offset: 0x0000EC62
		[LineNumberTable(42)]
		[MethodImpl(8)]
		internal RFC1522Codec()
		{
		}

		// Token: 0x06000330 RID: 816 RVA: 0x00010A6C File Offset: 0x0000EC6C
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException", "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[] { 54, 99, 130 })]
		[MethodImpl(8)]
		protected internal virtual string encodeText(string A_1, string A_2)
		{
			if (A_1 == null)
			{
				return null;
			}
			return this.encodeText(A_1, Charset.forName(A_2));
		}

		// Token: 0x06000331 RID: 817 RVA: 0x00010A84 File Offset: 0x0000EC84
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException", "java.io.UnsupportedEncodingException" })]
		[LineNumberTable(new byte[]
		{
			76, 99, 130, 122, 144, 105, 98, 106, 100, 144,
			105, 109, 144, 100, 106, 100, 144, 106, 111, 159,
			17, 100, 106, 111, 106
		})]
		[MethodImpl(8)]
		protected internal virtual string decodeText(string A_1)
		{
			if (A_1 == null)
			{
				return null;
			}
			if (!String.instancehelper_startsWith(A_1, "=?") || !String.instancehelper_endsWith(A_1, "?="))
			{
				string text = "RFC 1522 violation: malformed encoded content";
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text);
			}
			int num = String.instancehelper_length(A_1) - 2;
			int num2 = 2;
			int num3 = String.instancehelper_indexOf(A_1, 63, num2);
			if (num3 == num)
			{
				string text2 = "RFC 1522 violation: charset token not found";
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text2);
			}
			string text3 = String.instancehelper_substring(A_1, num2, num3);
			if (String.instancehelper_equals(text3, ""))
			{
				string text4 = "RFC 1522 violation: charset not specified";
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text4);
			}
			num2 = num3 + 1;
			num3 = String.instancehelper_indexOf(A_1, 63, num2);
			if (num3 == num)
			{
				string text5 = "RFC 1522 violation: encoding token not found";
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text5);
			}
			string text6 = String.instancehelper_substring(A_1, num2, num3);
			if (!String.instancehelper_equalsIgnoreCase(this.getEncoding(), text6))
			{
				string text7 = new StringBuilder().append("This codec cannot decode ").append(text6).append(" encoded content")
					.toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text7);
			}
			num2 = num3 + 1;
			num3 = String.instancehelper_indexOf(A_1, 63, num2);
			byte[] array = StringUtils.getBytesUsAscii(String.instancehelper_substring(A_1, num2, num3));
			array = this.doDecoding(array);
			return String.newhelper(array, text3);
		}

		// Token: 0x0400013E RID: 318
		protected internal const char SEP = '?';

		// Token: 0x0400013F RID: 319
		protected internal const string POSTFIX = "?=";

		// Token: 0x04000140 RID: 320
		protected internal const string PREFIX = "=?";
	}
}
