using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000035 RID: 53
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class Soundex : Object, StringEncoder, Encoder
	{
		// Token: 0x0600021F RID: 543 RVA: 0x0000DA06 File Offset: 0x0000BC06
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000220 RID: 544 RVA: 0x0000DA08 File Offset: 0x0000BC08
		[LineNumberTable(new byte[]
		{
			160, 145, 99, 130, 104, 104, 130, 155, 100, 138,
			105, 110, 110, 100, 107, 137, 165
		})]
		[MethodImpl(8)]
		public virtual string soundex(string str)
		{
			if (str == null)
			{
				return null;
			}
			str = SoundexUtils.clean(str);
			if (String.instancehelper_length(str) == 0)
			{
				return str;
			}
			char[] array = new char[] { '0', '0', '0', '0' };
			int num = 1;
			int num2 = 1;
			array[0] = String.instancehelper_charAt(str, 0);
			int num3 = (int)this.getMappingCode(str, 0);
			while (num < String.instancehelper_length(str) && num2 < array.Length)
			{
				string text = str;
				int num4 = num;
				num++;
				int mappingCode = (int)this.getMappingCode(text, num4);
				if (mappingCode != 0)
				{
					if (mappingCode != 48 && mappingCode != num3)
					{
						char[] array2 = array;
						int num5 = num2;
						num2++;
						array2[num5] = mappingCode;
					}
					num3 = mappingCode;
				}
			}
			return String.newhelper(array);
		}

		// Token: 0x06000221 RID: 545 RVA: 0x0000DAA0 File Offset: 0x0000BCA0
		[LineNumberTable(new byte[] { 159, 85, 130, 101, 110, 159, 6 })]
		[MethodImpl(8)]
		private char map(char A_1)
		{
			int num = (int)(A_1 - 'A');
			if (num < 0 || num >= this.getSoundexMapping().Length)
			{
				string text = new StringBuilder().append("The character is not mapped: ").append(A_1).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			return this.getSoundexMapping()[num];
		}

		// Token: 0x06000222 RID: 546 RVA: 0x0000DAEF File Offset: 0x0000BCEF
		private char[] getSoundexMapping()
		{
			return this.soundexMapping;
		}

		// Token: 0x06000223 RID: 547 RVA: 0x0000DAF8 File Offset: 0x0000BCF8
		[LineNumberTable(new byte[] { 160, 71, 142, 105, 106, 106, 106, 104, 110, 194 })]
		[MethodImpl(8)]
		private char getMappingCode(string A_1, int A_2)
		{
			int num = (int)this.map(String.instancehelper_charAt(A_1, A_2));
			if (A_2 > 1 && num != 48)
			{
				int num2 = (int)String.instancehelper_charAt(A_1, A_2 - 1);
				if (72 == num2 || 87 == num2)
				{
					int num3 = (int)String.instancehelper_charAt(A_1, A_2 - 2);
					int num4 = (int)this.map((char)num3);
					if (num4 == num || 72 == num3 || 87 == num3)
					{
						return '\0';
					}
				}
			}
			return (char)num;
		}

		// Token: 0x06000224 RID: 548 RVA: 0x0000DB54 File Offset: 0x0000BD54
		[LineNumberTable(new byte[] { 31, 232, 49, 231, 80, 107 })]
		[MethodImpl(8)]
		public Soundex()
		{
			this.maxLength = 4;
			this.soundexMapping = Soundex.US_ENGLISH_MAPPING;
		}

		// Token: 0x06000225 RID: 549 RVA: 0x0000DB7C File Offset: 0x0000BD7C
		[LineNumberTable(new byte[] { 45, 232, 35, 231, 94, 109, 114 })]
		[MethodImpl(8)]
		public Soundex(char[] mapping)
		{
			this.maxLength = 4;
			this.soundexMapping = new char[mapping.Length];
			ByteCodeHelper.arraycopy_primitive_2(mapping, 0, this.soundexMapping, 0, mapping.Length);
		}

		// Token: 0x06000226 RID: 550 RVA: 0x0000DBB8 File Offset: 0x0000BDB8
		[LineNumberTable(new byte[] { 58, 232, 22, 231, 107, 108 })]
		[MethodImpl(8)]
		public Soundex(string mapping)
		{
			this.maxLength = 4;
			this.soundexMapping = String.instancehelper_toCharArray(mapping);
		}

		// Token: 0x06000227 RID: 551 RVA: 0x0000DBE0 File Offset: 0x0000BDE0
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(132)]
		[MethodImpl(8)]
		public virtual int difference(string s1, string s2)
		{
			return SoundexUtils.difference(this, s1, s2);
		}

		// Token: 0x06000228 RID: 552 RVA: 0x0000DBEC File Offset: 0x0000BDEC
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 100, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "Parameter supplied to Soundex encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.soundex((string)obj);
		}

		// Token: 0x06000229 RID: 553 RVA: 0x0000DC14 File Offset: 0x0000BE14
		[LineNumberTable(167)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.soundex(str);
		}

		// Token: 0x0600022A RID: 554 RVA: 0x0000DC1F File Offset: 0x0000BE1F
		[Obsolete]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		public virtual int getMaxLength()
		{
			return this.maxLength;
		}

		// Token: 0x0600022B RID: 555 RVA: 0x0000DC27 File Offset: 0x0000BE27
		[Obsolete]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		public virtual void setMaxLength(int maxLength)
		{
			this.maxLength = maxLength;
		}

		// Token: 0x1700000B RID: 11
		// (get) Token: 0x0600022D RID: 557 RVA: 0x0000DC4B File Offset: 0x0000BE4B
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Soundex US_ENGLISH
		{
			[HideFromJava]
			get
			{
				return Soundex.__<>US_ENGLISH;
			}
		}

		// Token: 0x040000D4 RID: 212
		public const string US_ENGLISH_MAPPING_STRING = "01230120022455012623010202";

		// Token: 0x040000D5 RID: 213
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] US_ENGLISH_MAPPING = String.instancehelper_toCharArray("01230120022455012623010202");

		// Token: 0x040000D6 RID: 214
		internal static Soundex __<>US_ENGLISH = new Soundex();

		// Token: 0x040000D7 RID: 215
		[Obsolete]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		private int maxLength;

		// Token: 0x040000D8 RID: 216
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private char[] soundexMapping;
	}
}
