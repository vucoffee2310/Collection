using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x0200002C RID: 44
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class ColognePhonetic : Object, StringEncoder, Encoder
	{
		// Token: 0x060001AD RID: 429 RVA: 0x0000AB00 File Offset: 0x00008D00
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060001AE RID: 430 RVA: 0x0000AB04 File Offset: 0x00008D04
		[LineNumberTable(new byte[]
		{
			161, 47, 141, 135, 106, 103, 119, 105, 103, 226,
			61, 8, 233, 74
		})]
		[MethodImpl(8)]
		private string preprocess(string A_1)
		{
			A_1 = String.instancehelper_toUpperCase(A_1, Locale.GERMAN);
			char[] array = String.instancehelper_toCharArray(A_1);
			for (int i = 0; i < array.Length; i++)
			{
				if (array[i] > 'Z')
				{
					char[][] preprocess_MAP = ColognePhonetic.PREPROCESS_MAP;
					int num = preprocess_MAP.Length;
					for (int j = 0; j < num; j++)
					{
						char[] array2 = preprocess_MAP[j];
						if (array[i] == array2[0])
						{
							array[i] = array2[1];
							break;
						}
					}
				}
			}
			return String.newhelper(array);
		}

		// Token: 0x060001AF RID: 431 RVA: 0x0000AB78 File Offset: 0x00008D78
		[LineNumberTable(new byte[] { 159, 71, 162, 112, 101, 2, 230, 69 })]
		private static bool arrayContains(char[] A_0, char A_1)
		{
			int num = A_0.Length;
			for (int i = 0; i < num; i++)
			{
				int num2 = (int)A_0[i];
				if (num2 == (int)A_1)
				{
					return true;
				}
			}
			return false;
		}

		// Token: 0x060001B0 RID: 432 RVA: 0x0000ABA5 File Offset: 0x00008DA5
		[LineNumberTable(406)]
		[MethodImpl(8)]
		public virtual string encode(string text)
		{
			return this.colognePhonetic(text);
		}

		// Token: 0x060001B1 RID: 433 RVA: 0x0000ABB0 File Offset: 0x00008DB0
		[LineNumberTable(new byte[]
		{
			160, 193, 99, 162, 137, 111, 205, 99, 195, 136,
			104, 136, 108, 138, 164, 127, 19, 105, 114, 101,
			133, 105, 114, 105, 127, 11, 105, 127, 4, 105,
			126, 105, 127, 4, 100, 104, 107, 108, 105, 105,
			101, 127, 30, 137, 169, 159, 43, 137, 169, 126,
			102, 102, 102, 102, 102, 108, 134, 164, 127, 3,
			168, 99, 136
		})]
		[MethodImpl(8)]
		public virtual string colognePhonetic(string text)
		{
			if (text == null)
			{
				return null;
			}
			text = this.preprocess(text);
			ColognePhonetic.CologneOutputBuffer cologneOutputBuffer = new ColognePhonetic.CologneOutputBuffer(this, String.instancehelper_length(text) * 2);
			ColognePhonetic.CologneInputBuffer cologneInputBuffer = new ColognePhonetic.CologneInputBuffer(this, String.instancehelper_toCharArray(text));
			int num = 45;
			int num2 = 47;
			int i = cologneInputBuffer.length();
			while (i > 0)
			{
				int num3 = (int)cologneInputBuffer.removeNext();
				int num4;
				if ((i = cologneInputBuffer.length()) > 0)
				{
					num4 = (int)cologneInputBuffer.getNextChar();
				}
				else
				{
					num4 = 45;
				}
				int num5;
				if (ColognePhonetic.arrayContains(new char[] { 'A', 'E', 'I', 'J', 'O', 'U', 'Y' }, (char)num3))
				{
					num5 = 48;
				}
				else if (num3 == 72 || num3 < 65 || num3 > 90)
				{
					if (num2 == 47)
					{
						continue;
					}
					num5 = 45;
				}
				else if (num3 == 66 || (num3 == 80 && num4 != 72))
				{
					num5 = 49;
				}
				else if ((num3 == 68 || num3 == 84) && !ColognePhonetic.arrayContains(new char[] { 'S', 'C', 'Z' }, (char)num4))
				{
					num5 = 50;
				}
				else if (ColognePhonetic.arrayContains(new char[] { 'W', 'F', 'P', 'V' }, (char)num3))
				{
					num5 = 51;
				}
				else if (ColognePhonetic.arrayContains(new char[] { 'G', 'K', 'Q' }, (char)num3))
				{
					num5 = 52;
				}
				else if (num3 == 88 && !ColognePhonetic.arrayContains(new char[] { 'C', 'K', 'Q' }, (char)num))
				{
					num5 = 52;
					cologneInputBuffer.addLeft('S');
					i++;
				}
				else if (num3 == 83 || num3 == 90)
				{
					num5 = 56;
				}
				else if (num3 == 67)
				{
					if (num2 == 47)
					{
						if (ColognePhonetic.arrayContains(new char[] { 'A', 'H', 'K', 'L', 'O', 'Q', 'R', 'U', 'X' }, (char)num4))
						{
							num5 = 52;
						}
						else
						{
							num5 = 56;
						}
					}
					else if (ColognePhonetic.arrayContains(new char[] { 'S', 'Z' }, (char)num) || !ColognePhonetic.arrayContains(new char[] { 'A', 'H', 'O', 'U', 'K', 'Q', 'X' }, (char)num4))
					{
						num5 = 56;
					}
					else
					{
						num5 = 52;
					}
				}
				else if (ColognePhonetic.arrayContains(new char[] { 'T', 'D', 'X' }, (char)num3))
				{
					num5 = 56;
				}
				else if (num3 == 82)
				{
					num5 = 55;
				}
				else if (num3 == 76)
				{
					num5 = 53;
				}
				else if (num3 == 77 || num3 == 78)
				{
					num5 = 54;
				}
				else
				{
					num5 = num3;
				}
				if (num5 != 45 && ((num2 != num5 && (num5 != 48 || num2 == 47)) || num5 < 48 || num5 > 56))
				{
					cologneOutputBuffer.addRight((char)num5);
				}
				num = num3;
				num2 = num5;
			}
			return cologneOutputBuffer.toString();
		}

		// Token: 0x060001B2 RID: 434 RVA: 0x0000AEB7 File Offset: 0x000090B7
		[LineNumberTable(new byte[] { 160, 66, 232, 118 })]
		[MethodImpl(8)]
		public ColognePhonetic()
		{
		}

		// Token: 0x060001B3 RID: 435 RVA: 0x0000AEC4 File Offset: 0x000090C4
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 161, 24, 104, 255, 51, 70 })]
		[MethodImpl(8)]
		public virtual object encode(object @object)
		{
			if (!(@object is string))
			{
				string text = new StringBuilder().append("This method's parameter was expected to be of the type ").append(ClassLiteral<String>.Value.getName()).append(". But actually it was of the type ")
					.append(Object.instancehelper_getClass(@object).getName())
					.append(".")
					.toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.encode((string)@object);
		}

		// Token: 0x060001B4 RID: 436 RVA: 0x0000AF39 File Offset: 0x00009139
		[LineNumberTable(410)]
		[MethodImpl(8)]
		public virtual bool isEncodeEqual(string text1, string text2)
		{
			return String.instancehelper_equals(this.colognePhonetic(text1), this.colognePhonetic(text2));
		}

		// Token: 0x040000A9 RID: 169
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static char[][] PREPROCESS_MAP = new char[][]
		{
			new char[] { 'Ä', 'A' },
			new char[] { 'Ü', 'U' },
			new char[] { 'Ö', 'O' },
			new char[] { 'ß', 'S' }
		};

		// Token: 0x0200002D RID: 45
		[InnerClass(null, Modifiers.Private | Modifiers.Abstract)]
		[SourceFile("ColognePhonetic.java")]
		internal abstract class CologneBuffer : Object
		{
			// Token: 0x060001B6 RID: 438
			protected internal abstract char[] copyData(int, int);

			// Token: 0x060001B7 RID: 439 RVA: 0x0000AA78 File Offset: 0x00008C78
			[LineNumberTable(new byte[] { 160, 79, 15, 167, 103, 104 })]
			[MethodImpl(8)]
			public CologneBuffer(ColognePhonetic A_1, char[] A_2)
			{
				this.length = 0;
				this.data = A_2;
				this.length = A_2.Length;
			}

			// Token: 0x060001B8 RID: 440 RVA: 0x0000AAAC File Offset: 0x00008CAC
			[LineNumberTable(new byte[] { 160, 84, 239, 57, 231, 72, 108, 103 })]
			[MethodImpl(8)]
			public CologneBuffer(ColognePhonetic A_1, int A_2)
			{
				this.length = 0;
				this.data = new char[A_2];
				this.length = 0;
			}

			// Token: 0x060001B9 RID: 441 RVA: 0x0000AAE2 File Offset: 0x00008CE2
			public virtual int length()
			{
				return this.length;
			}

			// Token: 0x060001BA RID: 442 RVA: 0x0000AAEA File Offset: 0x00008CEA
			[LineNumberTable(211)]
			[MethodImpl(8)]
			public override string toString()
			{
				return String.newhelper(this.copyData(0, this.length));
			}

			// Token: 0x040000AA RID: 170
			[Modifiers(Modifiers.Protected | Modifiers.Final)]
			protected internal char[] data;

			// Token: 0x040000AB RID: 171
			protected internal int length;

			// Token: 0x040000AC RID: 172
			[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
			internal ColognePhonetic this$0 = A_1;
		}

		// Token: 0x0200002E RID: 46
		[InnerClass(null, Modifiers.Private)]
		[SourceFile("ColognePhonetic.java")]
		[Modifiers(Modifiers.Super)]
		internal sealed class CologneInputBuffer : ColognePhonetic.CologneBuffer
		{
			// Token: 0x060001BB RID: 443 RVA: 0x0000AFC0 File Offset: 0x000091C0
			[LineNumberTable(new byte[] { 160, 122, 103, 106 })]
			[MethodImpl(8)]
			public CologneInputBuffer(ColognePhonetic A_1, char[] A_2)
				: base(A_1, A_2)
			{
			}

			// Token: 0x060001BC RID: 444 RVA: 0x0000AFD4 File Offset: 0x000091D4
			[LineNumberTable(new byte[] { 160, 147, 103, 110 })]
			[MethodImpl(8)]
			public char removeNext()
			{
				int nextChar = (int)this.getNextChar();
				this.length--;
				return (char)nextChar;
			}

			// Token: 0x060001BD RID: 445 RVA: 0x0000AFF7 File Offset: 0x000091F7
			[LineNumberTable(253)]
			[MethodImpl(8)]
			public char getNextChar()
			{
				return this.data[this.getNextPos()];
			}

			// Token: 0x060001BE RID: 446 RVA: 0x0000B008 File Offset: 0x00009208
			[LineNumberTable(new byte[] { 159, 82, 98, 110, 110 })]
			[MethodImpl(8)]
			public void addLeft(char A_1)
			{
				this.length++;
				this.data[this.getNextPos()] = A_1;
			}

			// Token: 0x060001BF RID: 447 RVA: 0x0000B033 File Offset: 0x00009233
			[LineNumberTable(257)]
			protected internal int getNextPos()
			{
				return this.data.Length - this.length;
			}

			// Token: 0x060001C0 RID: 448 RVA: 0x0000B044 File Offset: 0x00009244
			[LineNumberTable(new byte[] { 160, 133, 103, 126 })]
			protected internal override char[] copyData(int A_1, int A_2)
			{
				char[] array = new char[A_2];
				ByteCodeHelper.arraycopy_primitive_2(this.data, this.data.Length - this.length + A_1, array, 0, A_2);
				return array;
			}

			// Token: 0x040000AD RID: 173
			[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
			internal new ColognePhonetic this$0 = A_1;
		}

		// Token: 0x0200002F RID: 47
		[InnerClass(null, Modifiers.Private)]
		[SourceFile("ColognePhonetic.java")]
		[Modifiers(Modifiers.Super)]
		internal sealed class CologneOutputBuffer : ColognePhonetic.CologneBuffer
		{
			// Token: 0x060001C1 RID: 449 RVA: 0x0000B077 File Offset: 0x00009277
			[LineNumberTable(new byte[] { 160, 103, 103, 106 })]
			[MethodImpl(8)]
			public CologneOutputBuffer(ColognePhonetic A_1, int A_2)
				: base(A_1, A_2)
			{
			}

			// Token: 0x060001C2 RID: 450 RVA: 0x0000B08C File Offset: 0x0000928C
			[LineNumberTable(new byte[] { 159, 87, 130, 110, 110 })]
			public void addRight(char A_1)
			{
				this.data[this.length] = A_1;
				this.length++;
			}

			// Token: 0x060001C3 RID: 451 RVA: 0x0000B0B8 File Offset: 0x000092B8
			[LineNumberTable(new byte[] { 160, 114, 103, 111 })]
			protected internal override char[] copyData(int A_1, int A_2)
			{
				char[] array = new char[A_2];
				ByteCodeHelper.arraycopy_primitive_2(this.data, A_1, array, 0, A_2);
				return array;
			}

			// Token: 0x040000AE RID: 174
			[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
			internal new ColognePhonetic this$0 = A_1;
		}
	}
}
