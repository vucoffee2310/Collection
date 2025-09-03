using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.nio.charset;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x02000020 RID: 32
	public class StringUtils : Object
	{
		// Token: 0x0600012F RID: 303 RVA: 0x000061BC File Offset: 0x000043BC
		[LineNumberTable(339)]
		[MethodImpl(8)]
		public static string newStringUtf8(byte[] bytes)
		{
			return StringUtils.newString(bytes, Charsets.__<>UTF_8);
		}

		// Token: 0x06000130 RID: 304 RVA: 0x000061CB File Offset: 0x000043CB
		[LineNumberTable(192)]
		[MethodImpl(8)]
		public static byte[] getBytesUtf8(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>UTF_8);
		}

		// Token: 0x06000131 RID: 305 RVA: 0x000061DA File Offset: 0x000043DA
		[LineNumberTable(new byte[] { 0, 99, 130 })]
		[MethodImpl(8)]
		private static byte[] getBytes(string A_0, Charset A_1)
		{
			if (A_0 == null)
			{
				return null;
			}
			return String.instancehelper_getBytes(A_0, A_1);
		}

		// Token: 0x06000132 RID: 306 RVA: 0x000061EA File Offset: 0x000043EA
		[LineNumberTable(196)]
		[MethodImpl(8)]
		private static IllegalStateException newIllegalStateException(string A_0, UnsupportedEncodingException A_1)
		{
			return new IllegalStateException(new StringBuilder().append(A_0).append(": ").append(A_1)
				.toString());
		}

		// Token: 0x06000133 RID: 307 RVA: 0x00006213 File Offset: 0x00004413
		[LineNumberTable(213)]
		[MethodImpl(8)]
		private static string newString(byte[] A_0, Charset A_1)
		{
			return (A_0 != null) ? String.newhelper(A_0, A_1) : null;
		}

		// Token: 0x06000134 RID: 308 RVA: 0x00006224 File Offset: 0x00004424
		[LineNumberTable(38)]
		[MethodImpl(8)]
		public StringUtils()
		{
		}

		// Token: 0x06000135 RID: 309 RVA: 0x0000622E File Offset: 0x0000442E
		[LineNumberTable(71)]
		[MethodImpl(8)]
		public static byte[] getBytesIso8859_1(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>ISO_8859_1);
		}

		// Token: 0x06000136 RID: 310 RVA: 0x00006240 File Offset: 0x00004440
		[LineNumberTable(new byte[] { 45, 99, 162, 125, 97 })]
		[MethodImpl(8)]
		public static byte[] getBytesUnchecked(string @string, string charsetName)
		{
			if (@string == null)
			{
				return null;
			}
			byte[] array;
			UnsupportedEncodingException ex2;
			try
			{
				array = String.instancehelper_getBytes(@string, charsetName);
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_001E;
			}
			return array;
			IL_001E:
			UnsupportedEncodingException ex3 = ex2;
			throw Throwable.__<unmap>(StringUtils.newIllegalStateException(charsetName, ex3));
		}

		// Token: 0x06000137 RID: 311 RVA: 0x0000628C File Offset: 0x0000448C
		[LineNumberTable(120)]
		[MethodImpl(8)]
		public static byte[] getBytesUsAscii(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>US_ASCII);
		}

		// Token: 0x06000138 RID: 312 RVA: 0x0000629B File Offset: 0x0000449B
		[LineNumberTable(138)]
		[MethodImpl(8)]
		public static byte[] getBytesUtf16(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>UTF_16);
		}

		// Token: 0x06000139 RID: 313 RVA: 0x000062AA File Offset: 0x000044AA
		[LineNumberTable(156)]
		[MethodImpl(8)]
		public static byte[] getBytesUtf16Be(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>UTF_16BE);
		}

		// Token: 0x0600013A RID: 314 RVA: 0x000062B9 File Offset: 0x000044B9
		[LineNumberTable(174)]
		[MethodImpl(8)]
		public static byte[] getBytesUtf16Le(string @string)
		{
			return StringUtils.getBytes(@string, Charsets.__<>UTF_16LE);
		}

		// Token: 0x0600013B RID: 315 RVA: 0x000062C8 File Offset: 0x000044C8
		[LineNumberTable(new byte[] { 160, 122, 99, 162, 125, 97 })]
		[MethodImpl(8)]
		public static string newString(byte[] bytes, string charsetName)
		{
			if (bytes == null)
			{
				return null;
			}
			string text;
			UnsupportedEncodingException ex2;
			try
			{
				text = String.newhelper(bytes, charsetName);
			}
			catch (UnsupportedEncodingException ex)
			{
				ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_001E;
			}
			return text;
			IL_001E:
			UnsupportedEncodingException ex3 = ex2;
			throw Throwable.__<unmap>(StringUtils.newIllegalStateException(charsetName, ex3));
		}

		// Token: 0x0600013C RID: 316 RVA: 0x00006314 File Offset: 0x00004514
		[LineNumberTable(259)]
		[MethodImpl(8)]
		public static string newStringIso8859_1(byte[] bytes)
		{
			return String.newhelper(bytes, Charsets.__<>ISO_8859_1);
		}

		// Token: 0x0600013D RID: 317 RVA: 0x00006323 File Offset: 0x00004523
		[LineNumberTable(275)]
		[MethodImpl(8)]
		public static string newStringUsAscii(byte[] bytes)
		{
			return String.newhelper(bytes, Charsets.__<>US_ASCII);
		}

		// Token: 0x0600013E RID: 318 RVA: 0x00006332 File Offset: 0x00004532
		[LineNumberTable(291)]
		[MethodImpl(8)]
		public static string newStringUtf16(byte[] bytes)
		{
			return String.newhelper(bytes, Charsets.__<>UTF_16);
		}

		// Token: 0x0600013F RID: 319 RVA: 0x00006341 File Offset: 0x00004541
		[LineNumberTable(307)]
		[MethodImpl(8)]
		public static string newStringUtf16Be(byte[] bytes)
		{
			return String.newhelper(bytes, Charsets.__<>UTF_16BE);
		}

		// Token: 0x06000140 RID: 320 RVA: 0x00006350 File Offset: 0x00004550
		[LineNumberTable(323)]
		[MethodImpl(8)]
		public static string newStringUtf16Le(byte[] bytes)
		{
			return String.newhelper(bytes, Charsets.__<>UTF_16LE);
		}
	}
}
