using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.nio.charset;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000C RID: 12
	public class Charsets : Object
	{
		// Token: 0x06000093 RID: 147 RVA: 0x00002BE2 File Offset: 0x00000DE2
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000094 RID: 148 RVA: 0x00002BE4 File Offset: 0x00000DE4
		[LineNumberTable(59)]
		[MethodImpl(8)]
		public Charsets()
		{
		}

		// Token: 0x06000095 RID: 149 RVA: 0x00002BEE File Offset: 0x00000DEE
		[LineNumberTable(74)]
		[MethodImpl(8)]
		public static Charset toCharset(Charset charset)
		{
			return (charset != null) ? charset : Charset.defaultCharset();
		}

		// Token: 0x06000096 RID: 150 RVA: 0x00002BFB File Offset: 0x00000DFB
		[LineNumberTable(87)]
		[MethodImpl(8)]
		public static Charset toCharset(string charset)
		{
			return (charset != null) ? Charset.forName(charset) : Charset.defaultCharset();
		}

		// Token: 0x17000001 RID: 1
		// (get) Token: 0x06000098 RID: 152 RVA: 0x00002C77 File Offset: 0x00000E77
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset ISO_8859_1
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>ISO_8859_1;
			}
		}

		// Token: 0x17000002 RID: 2
		// (get) Token: 0x06000099 RID: 153 RVA: 0x00002C7E File Offset: 0x00000E7E
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset US_ASCII
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>US_ASCII;
			}
		}

		// Token: 0x17000003 RID: 3
		// (get) Token: 0x0600009A RID: 154 RVA: 0x00002C85 File Offset: 0x00000E85
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset UTF_16
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>UTF_16;
			}
		}

		// Token: 0x17000004 RID: 4
		// (get) Token: 0x0600009B RID: 155 RVA: 0x00002C8C File Offset: 0x00000E8C
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset UTF_16BE
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>UTF_16BE;
			}
		}

		// Token: 0x17000005 RID: 5
		// (get) Token: 0x0600009C RID: 156 RVA: 0x00002C93 File Offset: 0x00000E93
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset UTF_16LE
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>UTF_16LE;
			}
		}

		// Token: 0x17000006 RID: 6
		// (get) Token: 0x0600009D RID: 157 RVA: 0x00002C9A File Offset: 0x00000E9A
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset UTF_8
		{
			[HideFromJava]
			get
			{
				return Charsets.__<>UTF_8;
			}
		}

		// Token: 0x0400003B RID: 59
		internal static Charset __<>ISO_8859_1 = Charset.forName("ISO-8859-1");

		// Token: 0x0400003C RID: 60
		internal static Charset __<>US_ASCII = Charset.forName("US-ASCII");

		// Token: 0x0400003D RID: 61
		internal static Charset __<>UTF_16 = Charset.forName("UTF-16");

		// Token: 0x0400003E RID: 62
		internal static Charset __<>UTF_16BE = Charset.forName("UTF-16BE");

		// Token: 0x0400003F RID: 63
		internal static Charset __<>UTF_16LE = Charset.forName("UTF-16LE");

		// Token: 0x04000040 RID: 64
		internal static Charset __<>UTF_8 = Charset.forName("UTF-8");
	}
}
