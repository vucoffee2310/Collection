using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;
using java.util.regex;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000033 RID: 51
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class Nysiis : Object, StringEncoder, Encoder
	{
		// Token: 0x0600020A RID: 522 RVA: 0x0000D377 File Offset: 0x0000B577
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x0600020B RID: 523 RVA: 0x0000D37C File Offset: 0x0000B57C
		private static bool isVowel(char A_0)
		{
			return A_0 == 'A' || A_0 == 'E' || A_0 == 'I' || A_0 == 'O' || A_0 == 'U';
		}

		// Token: 0x0600020C RID: 524 RVA: 0x0000D3A8 File Offset: 0x0000B5A8
		[LineNumberTable(new byte[] { 159, 94, 66, 104, 103 })]
		[MethodImpl(8)]
		public Nysiis(bool strict)
		{
			this.strict = strict;
		}

		// Token: 0x0600020D RID: 525 RVA: 0x0000D3C8 File Offset: 0x0000B5C8
		[LineNumberTable(new byte[]
		{
			160, 134, 99, 194, 136, 104, 226, 69, 127, 8,
			127, 8, 127, 8, 127, 8, 223, 8, 127, 8,
			191, 8, 108, 174, 103, 132, 108, 116, 116, 117,
			174, 108, 235, 56, 235, 76, 108, 176, 102, 111,
			176, 105, 144, 108, 239, 69, 102, 207, 104
		})]
		[MethodImpl(8)]
		public virtual string nysiis(string str)
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
			Pattern pat_MAC = Nysiis.PAT_MAC;
			object obj = str;
			CharSequence charSequence;
			charSequence.__<ref> = obj;
			str = pat_MAC.matcher(charSequence).replaceFirst("MCC");
			Pattern pat_KN = Nysiis.PAT_KN;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_KN.matcher(charSequence).replaceFirst("NN");
			Pattern pat_K = Nysiis.PAT_K;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_K.matcher(charSequence).replaceFirst("C");
			Pattern pat_PH_PF = Nysiis.PAT_PH_PF;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_PH_PF.matcher(charSequence).replaceFirst("FF");
			Pattern pat_SCH = Nysiis.PAT_SCH;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_SCH.matcher(charSequence).replaceFirst("SSS");
			Pattern pat_EE_IE = Nysiis.PAT_EE_IE;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_EE_IE.matcher(charSequence).replaceFirst("Y");
			Pattern pat_DT_ETC = Nysiis.PAT_DT_ETC;
			obj = str;
			charSequence.__<ref> = obj;
			str = pat_DT_ETC.matcher(charSequence).replaceFirst("D");
			StringBuilder stringBuilder = new StringBuilder(String.instancehelper_length(str));
			stringBuilder.append(String.instancehelper_charAt(str, 0));
			char[] array = String.instancehelper_toCharArray(str);
			int num = array.Length;
			for (int i = 1; i < num; i++)
			{
				int num2 = (int)((i >= num - 1) ? ' ' : array[i + 1]);
				int num3 = (int)((i >= num - 2) ? ' ' : array[i + 2]);
				char[] array2 = Nysiis.transcodeRemaining(array[i - 1], array[i], (char)num2, (char)num3);
				ByteCodeHelper.arraycopy_primitive_2(array2, 0, array, i, array2.Length);
				if (array[i] != array[i - 1])
				{
					stringBuilder.append(array[i]);
				}
			}
			if (stringBuilder.length() > 1)
			{
				int i = (int)stringBuilder.charAt(stringBuilder.length() - 1);
				if (i == 83)
				{
					stringBuilder.deleteCharAt(stringBuilder.length() - 1);
					i = (int)stringBuilder.charAt(stringBuilder.length() - 1);
				}
				if (stringBuilder.length() > 2)
				{
					int num2 = (int)stringBuilder.charAt(stringBuilder.length() - 2);
					if (num2 == 65 && i == 89)
					{
						stringBuilder.deleteCharAt(stringBuilder.length() - 2);
					}
				}
				if (i == 65)
				{
					stringBuilder.deleteCharAt(stringBuilder.length() - 1);
				}
			}
			string text = stringBuilder.toString();
			return (!this.isStrict()) ? text : String.instancehelper_substring(text, 0, Math.min(6, String.instancehelper_length(text)));
		}

		// Token: 0x0600020E RID: 526 RVA: 0x0000D650 File Offset: 0x0000B850
		[LineNumberTable(new byte[]
		{
			159, 112, 72, 106, 198, 104, 198, 101, 102, 101,
			102, 101, 198, 101, 101, 134, 230, 69, 111, 198,
			106, 198, 117, 203, 109, 171
		})]
		[MethodImpl(8)]
		private static char[] transcodeRemaining(char A_0, char A_1, char A_2, char A_3)
		{
			if (A_1 == 'E' && A_2 == 'V')
			{
				return Nysiis.CHARS_AF;
			}
			if (Nysiis.isVowel(A_1))
			{
				return Nysiis.CHARS_A;
			}
			if (A_1 == 'Q')
			{
				return Nysiis.CHARS_G;
			}
			if (A_1 == 'Z')
			{
				return Nysiis.CHARS_S;
			}
			if (A_1 == 'M')
			{
				return Nysiis.CHARS_N;
			}
			if (A_1 == 'K')
			{
				if (A_2 == 'N')
				{
					return Nysiis.CHARS_NN;
				}
				return Nysiis.CHARS_C;
			}
			else
			{
				if (A_1 == 'S' && A_2 == 'C' && A_3 == 'H')
				{
					return Nysiis.CHARS_SSS;
				}
				if (A_1 == 'P' && A_2 == 'H')
				{
					return Nysiis.CHARS_FF;
				}
				if (A_1 == 'H' && (!Nysiis.isVowel(A_0) || !Nysiis.isVowel(A_2)))
				{
					return new char[] { A_0 };
				}
				if (A_1 == 'W' && Nysiis.isVowel(A_0))
				{
					return new char[] { A_0 };
				}
				return new char[] { A_1 };
			}
		}

		// Token: 0x0600020F RID: 527 RVA: 0x0000D721 File Offset: 0x0000B921
		public virtual bool isStrict()
		{
			return this.strict;
		}

		// Token: 0x06000210 RID: 528 RVA: 0x0000D729 File Offset: 0x0000B929
		[LineNumberTable(new byte[] { 160, 64, 105 })]
		[MethodImpl(8)]
		public Nysiis()
			: this(true)
		{
		}

		// Token: 0x06000211 RID: 529 RVA: 0x0000D734 File Offset: 0x0000B934
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 97, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "Parameter supplied to Nysiis encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.nysiis((string)obj);
		}

		// Token: 0x06000212 RID: 530 RVA: 0x0000D75C File Offset: 0x0000B95C
		[LineNumberTable(228)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.nysiis(str);
		}

		// Token: 0x040000BD RID: 189
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_A = new char[] { 'A' };

		// Token: 0x040000BE RID: 190
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_AF = new char[] { 'A', 'F' };

		// Token: 0x040000BF RID: 191
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_C = new char[] { 'C' };

		// Token: 0x040000C0 RID: 192
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_FF = new char[] { 'F', 'F' };

		// Token: 0x040000C1 RID: 193
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_G = new char[] { 'G' };

		// Token: 0x040000C2 RID: 194
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_N = new char[] { 'N' };

		// Token: 0x040000C3 RID: 195
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_NN = new char[] { 'N', 'N' };

		// Token: 0x040000C4 RID: 196
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_S = new char[] { 'S' };

		// Token: 0x040000C5 RID: 197
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[] CHARS_SSS = new char[] { 'S', 'S', 'S' };

		// Token: 0x040000C6 RID: 198
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_MAC = Pattern.compile("^MAC");

		// Token: 0x040000C7 RID: 199
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_KN = Pattern.compile("^KN");

		// Token: 0x040000C8 RID: 200
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_K = Pattern.compile("^K");

		// Token: 0x040000C9 RID: 201
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_PH_PF = Pattern.compile("^(PH|PF)");

		// Token: 0x040000CA RID: 202
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_SCH = Pattern.compile("^SCH");

		// Token: 0x040000CB RID: 203
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_EE_IE = Pattern.compile("(EE|IE)$");

		// Token: 0x040000CC RID: 204
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern PAT_DT_ETC = Pattern.compile("(DT|RT|RD|NT|ND)$");

		// Token: 0x040000CD RID: 205
		private const char SPACE = ' ';

		// Token: 0x040000CE RID: 206
		private const int TRUE_LENGTH = 6;

		// Token: 0x040000CF RID: 207
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private bool strict;
	}
}
