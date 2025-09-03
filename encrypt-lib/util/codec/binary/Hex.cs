using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;
using java.nio.charset;

namespace com.edc.classbook.util.codec.binary
{
	// Token: 0x0200001F RID: 31
	[Implements(new string[] { "com.edc.classbook.util.codec.BinaryEncoder", "com.edc.classbook.util.codec.BinaryDecoder" })]
	public class Hex : Object, BinaryEncoder, Encoder, BinaryDecoder, Decoder
	{
		// Token: 0x0600011C RID: 284 RVA: 0x00005DC9 File Offset: 0x00003FC9
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x0600011D RID: 285 RVA: 0x00005DCC File Offset: 0x00003FCC
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 159, 98, 66, 105, 100, 159, 22 })]
		[MethodImpl(8)]
		protected internal static int toDigit(char ch, int index)
		{
			int num = Character.digit(ch, 16);
			if (num == -1)
			{
				string text = new StringBuilder().append("Illegal hexadecimal character ").append(ch).append(" at index ")
					.append(index)
					.toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text);
			}
			return num;
		}

		// Token: 0x0600011E RID: 286 RVA: 0x00005E20 File Offset: 0x00004020
		[LineNumberTable(125)]
		[MethodImpl(8)]
		public static char[] encodeHex(byte[] data, bool toLowerCase)
		{
			return Hex.encodeHex(data, (!toLowerCase) ? Hex.DIGITS_UPPER : Hex.DIGITS_LOWER);
		}

		// Token: 0x0600011F RID: 287 RVA: 0x00005E48 File Offset: 0x00004048
		[LineNumberTable(new byte[] { 91, 99, 137, 104, 116, 15, 198 })]
		protected internal static char[] encodeHex(byte[] data, char[] toDigits)
		{
			int num = data.Length;
			char[] array = new char[num << 1];
			int i = 0;
			int num2 = 0;
			while (i < num)
			{
				char[] array2 = array;
				int num3 = num2;
				num2++;
				array2[num3] = toDigits[(int)((uint)(240 & data[i]) >> 4)];
				char[] array3 = array;
				int num4 = num2;
				num2++;
				array3[num4] = toDigits[(int)(15 & data[i])];
				i++;
			}
			return array;
		}

		// Token: 0x06000120 RID: 288 RVA: 0x00005E93 File Offset: 0x00004093
		[LineNumberTable(109)]
		[MethodImpl(8)]
		public static char[] encodeHex(byte[] data)
		{
			return Hex.encodeHex(data, true);
		}

		// Token: 0x06000121 RID: 289 RVA: 0x00005EA0 File Offset: 0x000040A0
		[LineNumberTable(new byte[] { 160, 86, 104, 103 })]
		[MethodImpl(8)]
		public Hex(Charset charset)
		{
			this.charset = charset;
		}

		// Token: 0x06000122 RID: 290 RVA: 0x00005EBC File Offset: 0x000040BC
		public virtual Charset getCharset()
		{
			return this.charset;
		}

		// Token: 0x06000123 RID: 291 RVA: 0x00005EC4 File Offset: 0x000040C4
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[]
		{
			29, 131, 101, 176, 169, 104, 109, 100, 110, 100,
			236, 59, 230, 72
		})]
		[MethodImpl(8)]
		public static byte[] decodeHex(char[] data)
		{
			int num = data.Length;
			if ((num & 1) != 0)
			{
				string text = "Odd number of characters.";
				Throwable.__<suppressFillInStackTrace>();
				throw new DecoderException(text);
			}
			byte[] array = new byte[num >> 1];
			int num2 = 0;
			int i = 0;
			while (i < num)
			{
				int num3 = Hex.toDigit(data[i], i) << 4;
				i++;
				num3 |= Hex.toDigit(data[i], i);
				i++;
				array[num2] = (byte)((sbyte)(num3 & 255));
				num2++;
			}
			return array;
		}

		// Token: 0x06000124 RID: 292 RVA: 0x00005F30 File Offset: 0x00004130
		[LineNumberTable(161)]
		[MethodImpl(8)]
		public static string encodeHexString(byte[] data)
		{
			return String.newhelper(Hex.encodeHex(data));
		}

		// Token: 0x06000125 RID: 293 RVA: 0x00005F40 File Offset: 0x00004140
		[LineNumberTable(new byte[] { 160, 74, 136, 107 })]
		[MethodImpl(8)]
		public Hex()
		{
			this.charset = Hex.__<>DEFAULT_CHARSET;
		}

		// Token: 0x06000126 RID: 294 RVA: 0x00005F60 File Offset: 0x00004160
		[LineNumberTable(new byte[] { 160, 101, 110 })]
		[MethodImpl(8)]
		public Hex(string charsetName)
			: this(Charset.forName(charsetName))
		{
		}

		// Token: 0x06000127 RID: 295 RVA: 0x00005F70 File Offset: 0x00004170
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(232)]
		[MethodImpl(8)]
		public virtual byte[] decode(byte[] array)
		{
			return Hex.decodeHex(String.instancehelper_toCharArray(String.newhelper(array, this.getCharset())));
		}

		// Token: 0x06000128 RID: 296 RVA: 0x00005F8C File Offset: 0x0000418C
		[Throws(new string[] { "com.edc.classbook.util.codec.DecoderException" })]
		[LineNumberTable(new byte[] { 160, 137, 127, 2, 127, 2, 97 })]
		[MethodImpl(8)]
		public virtual object decode(object @object)
		{
			byte[] array2;
			ClassCastException ex3;
			try
			{
				char[] array = ((!(@object is string)) ? ((char[])((char[])@object)) : String.instancehelper_toCharArray((string)@object));
				array2 = Hex.decodeHex(array);
			}
			catch (Exception ex)
			{
				ClassCastException ex2 = ByteCodeHelper.MapException<ClassCastException>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_003E;
			}
			return array2;
			IL_003E:
			ClassCastException ex4 = ex3;
			string text = Throwable.instancehelper_getMessage(ex4);
			Exception ex5 = ex4;
			Throwable.__<suppressFillInStackTrace>();
			throw new DecoderException(text, ex5);
		}

		// Token: 0x06000129 RID: 297 RVA: 0x00006000 File Offset: 0x00004200
		[LineNumberTable(275)]
		[MethodImpl(8)]
		public virtual byte[] encode(byte[] array)
		{
			return String.instancehelper_getBytes(Hex.encodeHexString(array), this.getCharset());
		}

		// Token: 0x0600012A RID: 298 RVA: 0x00006018 File Offset: 0x00004218
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 183, 159, 8, 127, 2, 97 })]
		[MethodImpl(8)]
		public virtual object encode(object @object)
		{
			char[] array2;
			ClassCastException ex3;
			try
			{
				byte[] array = ((!(@object is string)) ? ((byte[])((byte[])@object)) : String.instancehelper_getBytes((string)@object, this.getCharset()));
				array2 = Hex.encodeHex(array);
			}
			catch (Exception ex)
			{
				ClassCastException ex2 = ByteCodeHelper.MapException<ClassCastException>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0044;
			}
			return array2;
			IL_0044:
			ClassCastException ex4 = ex3;
			string text = Throwable.instancehelper_getMessage(ex4);
			Exception ex5 = ex4;
			Throwable.__<suppressFillInStackTrace>();
			throw new EncoderException(text, ex5);
		}

		// Token: 0x0600012B RID: 299 RVA: 0x00006090 File Offset: 0x00004290
		[LineNumberTable(322)]
		[MethodImpl(8)]
		public virtual string getCharsetName()
		{
			return this.charset.name();
		}

		// Token: 0x0600012C RID: 300 RVA: 0x0000609F File Offset: 0x0000429F
		[LineNumberTable(332)]
		[MethodImpl(8)]
		public override string toString()
		{
			return new StringBuilder().append(base.toString()).append("[charsetName=").append(this.charset)
				.append("]")
				.toString();
		}

		// Token: 0x17000009 RID: 9
		// (get) Token: 0x0600012E RID: 302 RVA: 0x000061B5 File Offset: 0x000043B5
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Charset DEFAULT_CHARSET
		{
			[HideFromJava]
			get
			{
				return Hex.__<>DEFAULT_CHARSET;
			}
		}

		// Token: 0x04000086 RID: 134
		internal static Charset __<>DEFAULT_CHARSET = Charsets.__<>UTF_8;

		// Token: 0x04000087 RID: 135
		public const string DEFAULT_CHARSET_NAME = "UTF-8";

		// Token: 0x04000088 RID: 136
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] DIGITS_LOWER = new char[]
		{
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'a', 'b', 'c', 'd', 'e', 'f'
		};

		// Token: 0x04000089 RID: 137
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] DIGITS_UPPER = new char[]
		{
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'A', 'B', 'C', 'D', 'E', 'F'
		};

		// Token: 0x0400008A RID: 138
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Charset charset;
	}
}
