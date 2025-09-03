using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000034 RID: 52
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class RefinedSoundex : Object, StringEncoder, Encoder
	{
		// Token: 0x06000214 RID: 532 RVA: 0x0000D887 File Offset: 0x0000BA87
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000215 RID: 533 RVA: 0x0000D88C File Offset: 0x0000BA8C
		[LineNumberTable(new byte[]
		{
			126, 99, 130, 104, 104, 162, 102, 174, 131, 139,
			110, 100, 98, 99, 168, 226, 55, 230, 77
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
			StringBuilder stringBuilder = new StringBuilder();
			stringBuilder.append(String.instancehelper_charAt(str, 0));
			int num = 42;
			for (int i = 0; i < String.instancehelper_length(str); i++)
			{
				int mappingCode = (int)this.getMappingCode(String.instancehelper_charAt(str, i));
				if (mappingCode != num)
				{
					if (mappingCode != 0)
					{
						stringBuilder.append((char)mappingCode);
					}
					num = mappingCode;
				}
			}
			return stringBuilder.toString();
		}

		// Token: 0x06000216 RID: 534 RVA: 0x0000D904 File Offset: 0x0000BB04
		[LineNumberTable(new byte[] { 159, 102, 130, 104, 130 })]
		[MethodImpl(8)]
		internal virtual char getMappingCode(char A_1)
		{
			if (!Character.isLetter(A_1))
			{
				return '\0';
			}
			return this.soundexMapping[(int)(Character.toUpperCase(A_1) - 'A')];
		}

		// Token: 0x06000217 RID: 535 RVA: 0x0000D930 File Offset: 0x0000BB30
		[LineNumberTable(new byte[] { 13, 104, 107 })]
		[MethodImpl(8)]
		public RefinedSoundex()
		{
			this.soundexMapping = RefinedSoundex.US_ENGLISH_MAPPING;
		}

		// Token: 0x06000218 RID: 536 RVA: 0x0000D950 File Offset: 0x0000BB50
		[LineNumberTable(new byte[] { 26, 104, 109, 114 })]
		[MethodImpl(8)]
		public RefinedSoundex(char[] mapping)
		{
			this.soundexMapping = new char[mapping.Length];
			ByteCodeHelper.arraycopy_primitive_2(mapping, 0, this.soundexMapping, 0, mapping.Length);
		}

		// Token: 0x06000219 RID: 537 RVA: 0x0000D984 File Offset: 0x0000BB84
		[LineNumberTable(new byte[] { 39, 104, 108 })]
		[MethodImpl(8)]
		public RefinedSoundex(string mapping)
		{
			this.soundexMapping = String.instancehelper_toCharArray(mapping);
		}

		// Token: 0x0600021A RID: 538 RVA: 0x0000D9A5 File Offset: 0x0000BBA5
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(116)]
		[MethodImpl(8)]
		public virtual int difference(string s1, string s2)
		{
			return SoundexUtils.difference(this, s1, s2);
		}

		// Token: 0x0600021B RID: 539 RVA: 0x0000D9B1 File Offset: 0x0000BBB1
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 84, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "Parameter supplied to RefinedSoundex encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.soundex((string)obj);
		}

		// Token: 0x0600021C RID: 540 RVA: 0x0000D9D9 File Offset: 0x0000BBD9
		[LineNumberTable(149)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.soundex(str);
		}

		// Token: 0x1700000A RID: 10
		// (get) Token: 0x0600021E RID: 542 RVA: 0x0000D9FF File Offset: 0x0000BBFF
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static RefinedSoundex US_ENGLISH
		{
			[HideFromJava]
			get
			{
				return RefinedSoundex.__<>US_ENGLISH;
			}
		}

		// Token: 0x040000D0 RID: 208
		public const string US_ENGLISH_MAPPING_STRING = "01360240043788015936020505";

		// Token: 0x040000D1 RID: 209
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] US_ENGLISH_MAPPING = String.instancehelper_toCharArray("01360240043788015936020505");

		// Token: 0x040000D2 RID: 210
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private char[] soundexMapping;

		// Token: 0x040000D3 RID: 211
		internal static RefinedSoundex __<>US_ENGLISH = new RefinedSoundex();
	}
}
