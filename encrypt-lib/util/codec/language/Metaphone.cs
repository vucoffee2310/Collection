using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000032 RID: 50
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class Metaphone : Object, StringEncoder, Encoder
	{
		// Token: 0x060001FE RID: 510 RVA: 0x0000CBF6 File Offset: 0x0000ADF6
		public virtual int getMaxCodeLen()
		{
			return this.maxCodeLen;
		}

		// Token: 0x060001FF RID: 511 RVA: 0x0000CC00 File Offset: 0x0000AE00
		[LineNumberTable(new byte[] { 159, 59, 162, 98, 141, 141 })]
		[MethodImpl(8)]
		private bool isPreviousChar(StringBuilder A_1, int A_2, char A_3)
		{
			int num = 0;
			if (A_2 > 0 && A_2 < A_1.length())
			{
				num = ((A_1.charAt(A_2 - 1) == A_3) ? 1 : 0);
			}
			return num != 0;
		}

		// Token: 0x06000200 RID: 512 RVA: 0x0000CC2C File Offset: 0x0000AE2C
		private bool isLastChar(int A_1, int A_2)
		{
			return A_2 + 1 == A_1;
		}

		// Token: 0x06000201 RID: 513 RVA: 0x0000CC34 File Offset: 0x0000AE34
		[LineNumberTable(new byte[] { 160, 239, 98, 150, 112, 136 })]
		[MethodImpl(8)]
		private bool regionMatch(StringBuilder A_1, int A_2, string A_3)
		{
			int num = 0;
			if (A_2 >= 0 && A_2 + String.instancehelper_length(A_3) - 1 < A_1.length())
			{
				string text = A_1.substring(A_2, A_2 + String.instancehelper_length(A_3));
				num = (String.instancehelper_equals(text, A_3) ? 1 : 0);
			}
			return num != 0;
		}

		// Token: 0x06000202 RID: 514 RVA: 0x0000CC74 File Offset: 0x0000AE74
		[LineNumberTable(new byte[] { 159, 56, 66, 98, 143, 141 })]
		[MethodImpl(8)]
		private bool isNextChar(StringBuilder A_1, int A_2, char A_3)
		{
			int num = 0;
			if (A_2 >= 0 && A_2 < A_1.length() - 1)
			{
				num = ((A_1.charAt(A_2 + 1) == A_3) ? 1 : 0);
			}
			return num != 0;
		}

		// Token: 0x06000203 RID: 515 RVA: 0x0000CCA2 File Offset: 0x0000AEA2
		[LineNumberTable(331)]
		[MethodImpl(8)]
		private bool isVowel(StringBuilder A_1, int A_2)
		{
			return String.instancehelper_indexOf("AEIOU", (int)A_1.charAt(A_2)) >= 0;
		}

		// Token: 0x06000204 RID: 516 RVA: 0x0000CCBC File Offset: 0x0000AEBC
		[LineNumberTable(new byte[]
		{
			36, 98, 107, 166, 105, 174, 145, 104, 136, 223,
			35, 103, 146, 136, 133, 103, 146, 136, 133, 103,
			109, 130, 103, 109, 139, 136, 130, 101, 104, 130,
			168, 103, 131, 153, 138, 115, 139, 255, 88, 70,
			103, 206, 152, 133, 105, 165, 191, 16, 133, 112,
			105, 133, 159, 3, 105, 133, 154, 105, 133, 109,
			178, 142, 174, 137, 133, 191, 18, 148, 137, 133,
			154, 133, 191, 8, 133, 191, 9, 133, 141, 133,
			131, 191, 7, 142, 137, 133, 107, 133, 156, 133,
			112, 238, 73, 105, 133, 101, 112, 174, 137, 133,
			141, 142, 137, 133, 105, 133, 191, 17, 142, 137,
			133, 159, 1, 105, 133, 144, 165, 112, 142, 137,
			130, 171, 152, 203, 105, 105, 130, 105, 226, 69,
			134, 110, 140, 101
		})]
		[MethodImpl(8)]
		public virtual string metaphone(string txt)
		{
			if (txt == null || String.instancehelper_length(txt) == 0)
			{
				return "";
			}
			if (String.instancehelper_length(txt) == 1)
			{
				return String.instancehelper_toUpperCase(txt, Locale.ENGLISH);
			}
			char[] array = String.instancehelper_toCharArray(String.instancehelper_toUpperCase(txt, Locale.ENGLISH));
			StringBuilder stringBuilder = new StringBuilder(40);
			StringBuilder stringBuilder2 = new StringBuilder(10);
			char c = array[0];
			if (c == 'A')
			{
				if (array[1] == 'E')
				{
					stringBuilder.append(array, 1, array.Length - 1);
				}
				else
				{
					stringBuilder.append(array);
				}
			}
			else
			{
				if (c != 'G')
				{
					if (c != 'K')
					{
						if (c != 'P')
						{
							if (c == 'W')
							{
								if (array[1] == 'R')
								{
									stringBuilder.append(array, 1, array.Length - 1);
									goto IL_012F;
								}
								if (array[1] == 'H')
								{
									stringBuilder.append(array, 1, array.Length - 1);
									stringBuilder.setCharAt(0, 'W');
									goto IL_012F;
								}
								stringBuilder.append(array);
								goto IL_012F;
							}
							else
							{
								if (c == 'X')
								{
									array[0] = 'S';
									stringBuilder.append(array);
									goto IL_012F;
								}
								stringBuilder.append(array);
								goto IL_012F;
							}
						}
					}
				}
				if (array[1] == 'N')
				{
					stringBuilder.append(array, 1, array.Length - 1);
				}
				else
				{
					stringBuilder.append(array);
				}
			}
			IL_012F:
			int num = stringBuilder.length();
			int num2 = 0;
			while (stringBuilder2.length() < this.getMaxCodeLen() && num2 < num)
			{
				int num3 = (int)stringBuilder.charAt(num2);
				if (num3 != 67 && this.isPreviousChar(stringBuilder, num2, (char)num3))
				{
					num2++;
				}
				else
				{
					switch (num3)
					{
					case 65:
					case 69:
					case 73:
					case 79:
					case 85:
						if (num2 == 0)
						{
							stringBuilder2.append((char)num3);
						}
						break;
					case 66:
						if (!this.isPreviousChar(stringBuilder, num2, 'M') || !this.isLastChar(num, num2))
						{
							stringBuilder2.append((char)num3);
						}
						break;
					case 67:
						if (!this.isPreviousChar(stringBuilder, num2, 'S') || this.isLastChar(num, num2) || String.instancehelper_indexOf("EIY", (int)stringBuilder.charAt(num2 + 1)) < 0)
						{
							if (this.regionMatch(stringBuilder, num2, "CIA"))
							{
								stringBuilder2.append('X');
							}
							else if (!this.isLastChar(num, num2) && String.instancehelper_indexOf("EIY", (int)stringBuilder.charAt(num2 + 1)) >= 0)
							{
								stringBuilder2.append('S');
							}
							else if (this.isPreviousChar(stringBuilder, num2, 'S') && this.isNextChar(stringBuilder, num2, 'H'))
							{
								stringBuilder2.append('K');
							}
							else if (this.isNextChar(stringBuilder, num2, 'H'))
							{
								if (num2 == 0 && num >= 3 && this.isVowel(stringBuilder, 2))
								{
									stringBuilder2.append('K');
								}
								else
								{
									stringBuilder2.append('X');
								}
							}
							else
							{
								stringBuilder2.append('K');
							}
						}
						break;
					case 68:
						if (!this.isLastChar(num, num2 + 1) && this.isNextChar(stringBuilder, num2, 'G') && String.instancehelper_indexOf("EIY", (int)stringBuilder.charAt(num2 + 2)) >= 0)
						{
							stringBuilder2.append('J');
							num2 += 2;
						}
						else
						{
							stringBuilder2.append('T');
						}
						break;
					case 70:
					case 74:
					case 76:
					case 77:
					case 78:
					case 82:
						stringBuilder2.append((char)num3);
						break;
					case 71:
						if (!this.isLastChar(num, num2 + 1) || !this.isNextChar(stringBuilder, num2, 'H'))
						{
							if (this.isLastChar(num, num2 + 1) || !this.isNextChar(stringBuilder, num2, 'H') || this.isVowel(stringBuilder, num2 + 2))
							{
								if (num2 > 0)
								{
									if (this.regionMatch(stringBuilder, num2, "GN"))
									{
										break;
									}
									if (this.regionMatch(stringBuilder, num2, "GNED"))
									{
										break;
									}
								}
								int num4;
								if (this.isPreviousChar(stringBuilder, num2, 'G'))
								{
									num4 = 1;
								}
								else
								{
									num4 = 0;
								}
								if (!this.isLastChar(num, num2) && String.instancehelper_indexOf("EIY", (int)stringBuilder.charAt(num2 + 1)) >= 0 && num4 == 0)
								{
									stringBuilder2.append('J');
								}
								else
								{
									stringBuilder2.append('K');
								}
							}
						}
						break;
					case 72:
						if (!this.isLastChar(num, num2))
						{
							if (num2 <= 0 || String.instancehelper_indexOf("CSPTG", (int)stringBuilder.charAt(num2 - 1)) < 0)
							{
								if (this.isVowel(stringBuilder, num2 + 1))
								{
									stringBuilder2.append('H');
								}
							}
						}
						break;
					case 75:
						if (num2 > 0)
						{
							if (!this.isPreviousChar(stringBuilder, num2, 'C'))
							{
								stringBuilder2.append((char)num3);
							}
						}
						else
						{
							stringBuilder2.append((char)num3);
						}
						break;
					case 80:
						if (this.isNextChar(stringBuilder, num2, 'H'))
						{
							stringBuilder2.append('F');
						}
						else
						{
							stringBuilder2.append((char)num3);
						}
						break;
					case 81:
						stringBuilder2.append('K');
						break;
					case 83:
						if (this.regionMatch(stringBuilder, num2, "SH") || this.regionMatch(stringBuilder, num2, "SIO") || this.regionMatch(stringBuilder, num2, "SIA"))
						{
							stringBuilder2.append('X');
						}
						else
						{
							stringBuilder2.append('S');
						}
						break;
					case 84:
						if (this.regionMatch(stringBuilder, num2, "TIA") || this.regionMatch(stringBuilder, num2, "TIO"))
						{
							stringBuilder2.append('X');
						}
						else if (!this.regionMatch(stringBuilder, num2, "TCH"))
						{
							if (this.regionMatch(stringBuilder, num2, "TH"))
							{
								stringBuilder2.append('0');
							}
							else
							{
								stringBuilder2.append('T');
							}
						}
						break;
					case 86:
						stringBuilder2.append('F');
						break;
					case 87:
					case 89:
						if (!this.isLastChar(num, num2) && this.isVowel(stringBuilder, num2 + 1))
						{
							stringBuilder2.append((char)num3);
						}
						break;
					case 88:
						stringBuilder2.append('K');
						stringBuilder2.append('S');
						break;
					case 90:
						stringBuilder2.append('S');
						break;
					}
					num2++;
				}
				if (stringBuilder2.length() > this.getMaxCodeLen())
				{
					stringBuilder2.setLength(this.getMaxCodeLen());
				}
			}
			return stringBuilder2.toString();
		}

		// Token: 0x06000205 RID: 517 RVA: 0x0000D308 File Offset: 0x0000B508
		[LineNumberTable(new byte[] { 22, 232, 58, 231, 71 })]
		[MethodImpl(8)]
		public Metaphone()
		{
			this.maxCodeLen = 4;
		}

		// Token: 0x06000206 RID: 518 RVA: 0x0000D324 File Offset: 0x0000B524
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 161, 11, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "Parameter supplied to Metaphone encode is not of type java.lang.String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.metaphone((string)obj);
		}

		// Token: 0x06000207 RID: 519 RVA: 0x0000D34C File Offset: 0x0000B54C
		[LineNumberTable(395)]
		[MethodImpl(8)]
		public virtual string encode(string str)
		{
			return this.metaphone(str);
		}

		// Token: 0x06000208 RID: 520 RVA: 0x0000D357 File Offset: 0x0000B557
		[LineNumberTable(407)]
		[MethodImpl(8)]
		public virtual bool isMetaphoneEqual(string str1, string str2)
		{
			return String.instancehelper_equals(this.metaphone(str1), this.metaphone(str2));
		}

		// Token: 0x06000209 RID: 521 RVA: 0x0000D36E File Offset: 0x0000B56E
		public virtual void setMaxCodeLen(int maxCodeLen)
		{
			this.maxCodeLen = maxCodeLen;
		}

		// Token: 0x040000B9 RID: 185
		private const string VOWELS = "AEIOU";

		// Token: 0x040000BA RID: 186
		private const string FRONTV = "EIY";

		// Token: 0x040000BB RID: 187
		private const string VARSON = "CSPTG";

		// Token: 0x040000BC RID: 188
		private int maxCodeLen;
	}
}
