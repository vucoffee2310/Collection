using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000053 RID: 83
	public class Rule : Object
	{
		// Token: 0x060002B8 RID: 696 RVA: 0x0000F50A File Offset: 0x0000D70A
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060002B9 RID: 697 RVA: 0x0000F50C File Offset: 0x0000D70C
		[Signature("(Lcom/edc/classbook/util/codec/language/bm/NameType;Lcom/edc/classbook/util/codec/language/bm/RuleType;Lcom/edc/classbook/util/codec/language/bm/Languages$LanguageSet;)Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;")]
		[LineNumberTable(261)]
		[MethodImpl(8)]
		public static List getInstance(NameType nameType, RuleType rt, Languages.LanguageSet langs)
		{
			return (!langs.isSingleton()) ? Rule.getInstance(nameType, rt, "any") : Rule.getInstance(nameType, rt, langs.getAny());
		}

		// Token: 0x060002BA RID: 698 RVA: 0x0000F534 File Offset: 0x0000D734
		[Signature("(Lcom/edc/classbook/util/codec/language/bm/NameType;Lcom/edc/classbook/util/codec/language/bm/RuleType;Ljava/lang/String;)Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;")]
		[LineNumberTable(new byte[] { 160, 163, 159, 8, 99, 223, 18 })]
		[MethodImpl(8)]
		public static List getInstance(NameType nameType, RuleType rt, string lang)
		{
			List list = (List)((Map)((Map)Rule.RULES.get(nameType)).get(rt)).get(lang);
			if (list == null)
			{
				string text = String.format("No rules found for %s, %s, %s.", new object[]
				{
					nameType.getName(),
					rt.getName(),
					lang
				});
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			return list;
		}

		// Token: 0x060002BB RID: 699 RVA: 0x0000F59D File Offset: 0x0000D79D
		public virtual string getPattern()
		{
			return this.pattern;
		}

		// Token: 0x060002BC RID: 700 RVA: 0x0000F5A8 File Offset: 0x0000D7A8
		[LineNumberTable(new byte[]
		{
			158, 245, 74, 100, 176, 108, 132, 150, 226, 69,
			127, 24, 98, 127, 56, 130
		})]
		[MethodImpl(8)]
		public virtual bool patternAndContextMatches(CharSequence input, int i)
		{
			CharSequence charSequence = input;
			object _<ref> = charSequence.__<ref>;
			if (i < 0)
			{
				string text = "Can not match pattern at negative indexes";
				Throwable.__<suppressFillInStackTrace>();
				throw new IndexOutOfBoundsException(text);
			}
			int num = String.instancehelper_length(this.pattern);
			int num2 = i + num;
			int num3 = num2;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			if (num3 > charSequence2.length())
			{
				return false;
			}
			object obj2 = _<ref>;
			int num4 = num2;
			obj = obj2;
			charSequence2.__<ref> = obj;
			object _<ref>2 = charSequence2.subSequence(i, num4).__<ref>;
			obj = this.pattern;
			if (!Object.instancehelper_equals(_<ref>2, obj))
			{
				return false;
			}
			Rule.RPattern rpattern = this.rContext;
			object obj3 = _<ref>;
			int num5 = num2;
			obj = _<ref>;
			charSequence2.__<ref> = obj;
			num4 = charSequence2.length();
			int num6 = num5;
			obj = obj3;
			charSequence2.__<ref> = obj;
			obj = charSequence2.subSequence(num6, num4).__<ref>;
			charSequence2.__<ref> = obj;
			if (!rpattern.isMatch(charSequence2))
			{
				return false;
			}
			Rule.RPattern rpattern2 = this.lContext;
			object obj4 = _<ref>;
			num6 = 0;
			obj = obj4;
			charSequence2.__<ref> = obj;
			obj = charSequence2.subSequence(num6, i).__<ref>;
			charSequence2.__<ref> = obj;
			return rpattern2.isMatch(charSequence2);
		}

		// Token: 0x060002BD RID: 701 RVA: 0x0000F6D2 File Offset: 0x0000D8D2
		public virtual Rule.PhonemeExpr getPhoneme()
		{
			return this.phoneme;
		}

		// Token: 0x060002BE RID: 702 RVA: 0x0000F6DC File Offset: 0x0000D8DC
		[LineNumberTable(new byte[] { 159, 92, 140, 120, 123, 2, 230, 69 })]
		[MethodImpl(8)]
		private static bool contains(CharSequence A_0, char A_1)
		{
			CharSequence charSequence = A_0;
			object _<ref> = charSequence.__<ref>;
			int num = 0;
			for (;;)
			{
				int num2 = num;
				object obj = _<ref>;
				CharSequence charSequence2;
				charSequence2.__<ref> = obj;
				if (num2 >= charSequence2.length())
				{
					return false;
				}
				object obj2 = _<ref>;
				int num3 = num;
				obj = obj2;
				charSequence2.__<ref> = obj;
				if (charSequence2.charAt(num3) == A_1)
				{
					break;
				}
				num++;
			}
			return true;
		}

		// Token: 0x060002BF RID: 703 RVA: 0x0000F734 File Offset: 0x0000D934
		[LineNumberTable(new byte[]
		{
			159, 83, 148, 127, 9, 130, 127, 20, 127, 21,
			2, 238, 69
		})]
		[MethodImpl(8)]
		private static bool endsWith(CharSequence A_0, CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2 = A_0;
			object _<ref>2 = charSequence2.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence3;
			charSequence3.__<ref> = obj;
			int num = charSequence3.length();
			obj = _<ref>2;
			charSequence3.__<ref> = obj;
			if (num > charSequence3.length())
			{
				return false;
			}
			obj = _<ref>2;
			charSequence3.__<ref> = obj;
			int num2 = charSequence3.length() - 1;
			obj = _<ref>;
			charSequence3.__<ref> = obj;
			for (int i = charSequence3.length() - 1; i >= 0; i += -1)
			{
				object obj2 = _<ref>2;
				int num3 = num2;
				obj = obj2;
				charSequence3.__<ref> = obj;
				char c = charSequence3.charAt(num3);
				object obj3 = _<ref>;
				num3 = i;
				obj = obj3;
				charSequence3.__<ref> = obj;
				if (c != charSequence3.charAt(num3))
				{
					return false;
				}
				num2 += -1;
			}
			return true;
		}

		// Token: 0x060002C0 RID: 704 RVA: 0x0000F7F8 File Offset: 0x0000D9F8
		[LineNumberTable(new byte[]
		{
			159, 14, 148, 127, 9, 130, 122, 127, 21, 2,
			235, 69
		})]
		[MethodImpl(8)]
		private static bool startsWith(CharSequence A_0, CharSequence A_1)
		{
			CharSequence charSequence = A_1;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2 = A_0;
			object _<ref>2 = charSequence2.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence3;
			charSequence3.__<ref> = obj;
			int num = charSequence3.length();
			obj = _<ref>2;
			charSequence3.__<ref> = obj;
			if (num > charSequence3.length())
			{
				return false;
			}
			int num2 = 0;
			for (;;)
			{
				int num3 = num2;
				obj = _<ref>;
				charSequence3.__<ref> = obj;
				if (num3 >= charSequence3.length())
				{
					return true;
				}
				object obj2 = _<ref>2;
				int num4 = num2;
				obj = obj2;
				charSequence3.__<ref> = obj;
				char c = charSequence3.charAt(num4);
				object obj3 = _<ref>;
				num4 = num2;
				obj = obj3;
				charSequence3.__<ref> = obj;
				if (c != charSequence3.charAt(num4))
				{
					break;
				}
				num2++;
			}
			return false;
		}

		// Token: 0x060002C1 RID: 705 RVA: 0x0000F89F File Offset: 0x0000DA9F
		[LineNumberTable(211)]
		[MethodImpl(8)]
		private static string createResourceName(NameType A_0, RuleType A_1, string A_2)
		{
			return String.format("org/apache/commons/codec/language/bm/%s_%s_%s.txt", new object[]
			{
				A_0.getName(),
				A_1.getName(),
				A_2
			});
		}

		// Token: 0x060002C2 RID: 706 RVA: 0x0000F8CC File Offset: 0x0000DACC
		[LineNumberTable(new byte[]
		{
			160, 174, 108, 103, 109, 144, 105, 114, 155, 159,
			11
		})]
		[MethodImpl(8)]
		private static Rule.Phoneme parsePhoneme(string A_0)
		{
			int num = String.instancehelper_indexOf(A_0, "[");
			Languages.LanguageSet languageSet;
			CharSequence charSequence;
			if (num < 0)
			{
				Rule.Phoneme.__<clinit>();
				languageSet = Languages.__<>ANY_LANGUAGE;
				charSequence.__<ref> = A_0;
				return new Rule.Phoneme(charSequence, languageSet);
			}
			if (!String.instancehelper_endsWith(A_0, "]"))
			{
				string text = "Phoneme expression contains a '[' but does not end in ']'";
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			string text2 = String.instancehelper_substring(A_0, 0, num);
			string text3 = String.instancehelper_substring(A_0, num + 1, String.instancehelper_length(A_0) - 1);
			HashSet.__<clinit>();
			HashSet hashSet = new HashSet(Arrays.asList(String.instancehelper_split(text3, "[+]")));
			Rule.Phoneme.__<clinit>();
			object obj = text2;
			languageSet = Languages.LanguageSet.from(hashSet);
			object obj2 = obj;
			charSequence.__<ref> = obj2;
			return new Rule.Phoneme(charSequence, languageSet);
		}

		// Token: 0x060002C3 RID: 707 RVA: 0x0000F994 File Offset: 0x0000DB94
		[LineNumberTable(new byte[] { 160, 113, 117, 150, 99, 191, 6 })]
		[MethodImpl(8)]
		private static Scanner createScanner(string A_0)
		{
			string text = String.format("org/apache/commons/codec/language/bm/%s.txt", new object[] { A_0 });
			InputStream resourceAsStream = ClassLiteral<Languages>.Value.getClassLoader(Rule.__<GetCallerID>()).getResourceAsStream(text);
			if (resourceAsStream == null)
			{
				string text2 = new StringBuilder().append("Unable to load resource: ").append(text).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text2);
			}
			return new Scanner(resourceAsStream, "UTF-8");
		}

		// Token: 0x060002C4 RID: 708 RVA: 0x0000FA04 File Offset: 0x0000DC04
		[Signature("(Ljava/util/Scanner;Ljava/lang/String;)Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;")]
		[LineNumberTable(new byte[]
		{
			160, 211, 102, 130, 98, 107, 100, 103, 131, 99,
			113, 167, 110, 167, 110, 101, 204, 137, 105, 165,
			145, 120, 127, 1, 191, 22, 159, 21, 133, 110,
			102, 223, 40, 107, 107, 107, 112, 99, 242, 78,
			221, 226, 61, 98, 255, 24, 71, 133
		})]
		[MethodImpl(8)]
		private static List parseRules(Scanner A_0, string A_1)
		{
			ArrayList arrayList = new ArrayList();
			int num = 0;
			int num2 = 0;
			while (A_0.hasNextLine())
			{
				num++;
				string text = A_0.nextLine();
				string text2 = text;
				if (num2 != 0)
				{
					if (String.instancehelper_endsWith(text2, "*/"))
					{
						num2 = 0;
					}
				}
				else if (String.instancehelper_startsWith(text2, "/*"))
				{
					num2 = 1;
				}
				else
				{
					int num3 = String.instancehelper_indexOf(text2, "//");
					if (num3 >= 0)
					{
						text2 = String.instancehelper_substring(text2, 0, num3);
					}
					text2 = String.instancehelper_trim(text2);
					if (String.instancehelper_length(text2) != 0)
					{
						if (String.instancehelper_startsWith(text2, "#include"))
						{
							string text3 = String.instancehelper_trim(String.instancehelper_substring(text2, String.instancehelper_length("#include")));
							string text4 = text3;
							object obj = " ";
							CharSequence charSequence;
							charSequence.__<ref> = obj;
							if (String.instancehelper_contains(text4, charSequence))
							{
								string text5 = new StringBuilder().append("Malformed import statement '").append(text).append("' in ")
									.append(A_1)
									.toString();
								Throwable.__<suppressFillInStackTrace>();
								throw new IllegalArgumentException(text5);
							}
							((List)arrayList).addAll(Rule.parseRules(Rule.createScanner(text3), new StringBuilder().append(A_1).append("->").append(text3)
								.toString()));
						}
						else
						{
							string[] array = String.instancehelper_split(text2, "\\s+");
							if (array.Length != 4)
							{
								string text6 = new StringBuilder().append("Malformed rule statement split into ").append(array.Length).append(" parts: ")
									.append(text)
									.append(" in ")
									.append(A_1)
									.toString();
								Throwable.__<suppressFillInStackTrace>();
								throw new IllegalArgumentException(text6);
							}
							IllegalArgumentException ex2;
							try
							{
								string text7 = Rule.stripQuotes(array[0]);
								string text8 = Rule.stripQuotes(array[1]);
								string text9 = Rule.stripQuotes(array[2]);
								Rule.PhonemeExpr phonemeExpr = Rule.parsePhonemeExpr(Rule.stripQuotes(array[3]));
								int num4 = num;
								Rule$2 rule$ = new Rule$2(text7, text8, text9, phonemeExpr, num4, A_1);
								((List)arrayList).add(rule$);
							}
							catch (IllegalArgumentException ex)
							{
								ex2 = ByteCodeHelper.MapException<IllegalArgumentException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
								goto IL_01FA;
							}
							continue;
							IL_01FA:
							IllegalArgumentException ex3 = ex2;
							string text10 = new StringBuilder().append("Problem parsing line '").append(num).append("' in ")
								.append(A_1)
								.toString();
							Exception ex4 = ex3;
							Throwable.__<suppressFillInStackTrace>();
							throw new IllegalStateException(text10, ex4);
						}
					}
				}
			}
			return arrayList;
		}

		// Token: 0x060002C5 RID: 709 RVA: 0x0000FC60 File Offset: 0x0000DE60
		[LineNumberTable(new byte[] { 161, 156, 109, 169, 109, 177 })]
		[MethodImpl(8)]
		private static string stripQuotes(string A_0)
		{
			if (String.instancehelper_startsWith(A_0, "\""))
			{
				A_0 = String.instancehelper_substring(A_0, 1);
			}
			if (String.instancehelper_endsWith(A_0, "\""))
			{
				A_0 = String.instancehelper_substring(A_0, 0, String.instancehelper_length(A_0) - 1);
			}
			return A_0;
		}

		// Token: 0x060002C6 RID: 710 RVA: 0x0000FC98 File Offset: 0x0000DE98
		[LineNumberTable(new byte[]
		{
			160, 190, 112, 109, 176, 102, 112, 125, 46, 168,
			122, 191, 18, 137
		})]
		[MethodImpl(8)]
		private static Rule.PhonemeExpr parsePhonemeExpr(string A_0)
		{
			if (!String.instancehelper_startsWith(A_0, "("))
			{
				return Rule.parsePhoneme(A_0);
			}
			if (!String.instancehelper_endsWith(A_0, ")"))
			{
				string text = "Phoneme starts with '(' so must end with ')'";
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			ArrayList arrayList = new ArrayList();
			string text2 = String.instancehelper_substring(A_0, 1, String.instancehelper_length(A_0) - 1);
			string[] array = String.instancehelper_split(text2, "[|]");
			int num = array.Length;
			for (int i = 0; i < num; i++)
			{
				string text3 = array[i];
				((List)arrayList).add(Rule.parsePhoneme(text3));
			}
			if (String.instancehelper_startsWith(text2, "|") || String.instancehelper_endsWith(text2, "|"))
			{
				List list = arrayList;
				Rule.Phoneme.__<clinit>();
				object obj = "";
				Languages.LanguageSet _<>ANY_LANGUAGE = Languages.__<>ANY_LANGUAGE;
				object obj2 = obj;
				CharSequence charSequence;
				charSequence.__<ref> = obj2;
				list.add(new Rule.Phoneme(charSequence, _<>ANY_LANGUAGE));
			}
			return new Rule.PhonemeList(arrayList);
		}

		// Token: 0x060002C7 RID: 711 RVA: 0x0000FD78 File Offset: 0x0000DF78
		[LineNumberTable(new byte[]
		{
			161, 43, 108, 108, 127, 2, 157, 103, 134, 136,
			232, 71, 233, 71, 142, 102, 131, 233, 70, 134,
			233, 72, 109, 141, 110, 113, 159, 2, 110, 100,
			138, 100, 138, 134, 236, 70, 131, 236, 70, 131,
			236, 76
		})]
		[MethodImpl(8)]
		private static Rule.RPattern pattern(string A_0)
		{
			int num = (String.instancehelper_startsWith(A_0, "^") ? 1 : 0);
			int num2 = (String.instancehelper_endsWith(A_0, "$") ? 1 : 0);
			string text = String.instancehelper_substring(A_0, (num == 0) ? 0 : 1, (num2 == 0) ? String.instancehelper_length(A_0) : (String.instancehelper_length(A_0) - 1));
			string text2 = text;
			object obj = "[";
			CharSequence charSequence;
			charSequence.__<ref> = obj;
			if (!String.instancehelper_contains(text2, charSequence))
			{
				if (num != 0 && num2 != 0)
				{
					if (String.instancehelper_length(text) == 0)
					{
						return new Rule$3();
					}
					return new Rule$4(text);
				}
				else
				{
					if ((num != 0 || num2 != 0) && String.instancehelper_length(text) == 0)
					{
						return Rule.__<>ALL_STRINGS_RMATCHER;
					}
					if (num != 0)
					{
						return new Rule$5(text);
					}
					if (num2 != 0)
					{
						return new Rule$6(text);
					}
				}
			}
			else
			{
				int num3 = (String.instancehelper_startsWith(text, "[") ? 1 : 0);
				int num4 = (String.instancehelper_endsWith(text, "]") ? 1 : 0);
				if (num3 != 0 && num4 != 0)
				{
					string text3 = String.instancehelper_substring(text, 1, String.instancehelper_length(text) - 1);
					string text4 = text3;
					obj = "[";
					charSequence.__<ref> = obj;
					if (!String.instancehelper_contains(text4, charSequence))
					{
						int num5 = (String.instancehelper_startsWith(text3, "^") ? 1 : 0);
						if (num5 != 0)
						{
							text3 = String.instancehelper_substring(text3, 1);
						}
						string text5 = text3;
						int num6 = ((num5 != 0) ? 0 : 1);
						if (num != 0 && num2 != 0)
						{
							return new Rule$7(text5, num6 != 0);
						}
						if (num != 0)
						{
							return new Rule$8(text5, num6 != 0);
						}
						if (num2 != 0)
						{
							return new Rule$9(text5, num6 != 0);
						}
					}
				}
			}
			return new Rule$10(A_0);
		}

		// Token: 0x060002C8 RID: 712 RVA: 0x0000FEEC File Offset: 0x0000E0EC
		[LineNumberTable(new byte[] { 160, 102, 105, 150, 99, 191, 6 })]
		[MethodImpl(8)]
		private static Scanner createScanner(NameType A_0, RuleType A_1, string A_2)
		{
			string text = Rule.createResourceName(A_0, A_1, A_2);
			InputStream resourceAsStream = ClassLiteral<Languages>.Value.getClassLoader(Rule.__<GetCallerID>()).getResourceAsStream(text);
			if (resourceAsStream == null)
			{
				string text2 = new StringBuilder().append("Unable to load resource: ").append(text).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text2);
			}
			return new Scanner(resourceAsStream, "UTF-8");
		}

		// Token: 0x060002C9 RID: 713 RVA: 0x0000FF50 File Offset: 0x0000E150
		[LineNumberTable(new byte[] { 161, 187, 104, 103, 127, 6, 127, 6, 104 })]
		[MethodImpl(8)]
		public Rule(string pattern, string lContext, string rContext, Rule.PhonemeExpr phoneme)
		{
			this.pattern = pattern;
			this.lContext = Rule.pattern(new StringBuilder().append(lContext).append("$").toString());
			this.rContext = Rule.pattern(new StringBuilder().append("^").append(rContext).toString());
			this.phoneme = phoneme;
		}

		// Token: 0x060002CA RID: 714 RVA: 0x0000FFBE File Offset: 0x0000E1BE
		public virtual Rule.RPattern getLContext()
		{
			return this.lContext;
		}

		// Token: 0x060002CB RID: 715 RVA: 0x0000FFC6 File Offset: 0x0000E1C6
		public virtual Rule.RPattern getRContext()
		{
			return this.rContext;
		}

		// Token: 0x060002CC RID: 716 RVA: 0x0000FFD0 File Offset: 0x0000E1D0
		[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
		[LineNumberTable(80)]
		[MethodImpl(8)]
		internal static bool access$100(CharSequence A_0, CharSequence A_1)
		{
			CharSequence charSequence = A_0;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2 = A_1;
			object _<ref>2 = charSequence2.__<ref>;
			object obj = _<ref>;
			object obj2 = _<ref>2;
			object obj3 = obj;
			CharSequence charSequence3;
			charSequence3.__<ref> = obj3;
			CharSequence charSequence4 = charSequence3;
			obj3 = obj2;
			charSequence3.__<ref> = obj3;
			return Rule.startsWith(charSequence4, charSequence3);
		}

		// Token: 0x060002CD RID: 717 RVA: 0x00010024 File Offset: 0x0000E224
		[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
		[LineNumberTable(80)]
		[MethodImpl(8)]
		internal static bool access$200(CharSequence A_0, CharSequence A_1)
		{
			CharSequence charSequence = A_0;
			object _<ref> = charSequence.__<ref>;
			CharSequence charSequence2 = A_1;
			object _<ref>2 = charSequence2.__<ref>;
			object obj = _<ref>;
			object obj2 = _<ref>2;
			object obj3 = obj;
			CharSequence charSequence3;
			charSequence3.__<ref> = obj3;
			CharSequence charSequence4 = charSequence3;
			obj3 = obj2;
			charSequence3.__<ref> = obj3;
			return Rule.endsWith(charSequence4, charSequence3);
		}

		// Token: 0x060002CE RID: 718 RVA: 0x00010078 File Offset: 0x0000E278
		[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
		[LineNumberTable(80)]
		[MethodImpl(8)]
		internal static bool access$300(CharSequence A_0, char A_1)
		{
			CharSequence charSequence = A_0;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			return Rule.contains(charSequence2, A_1);
		}

		// Token: 0x060002CF RID: 719 RVA: 0x000100B0 File Offset: 0x0000E2B0
		[LineNumberTable(new byte[]
		{
			109, 234, 77, 212, 118, 145, 127, 0, 135, 104,
			159, 9, 191, 24, 2, 98, 191, 22, 110, 191,
			13, 241, 49, 235, 82, 243, 43, 233, 87
		})]
		static Rule()
		{
			EnumMap.__<clinit>();
			Rule.RULES = new EnumMap(ClassLiteral<NameType>.Value);
			NameType[] array = NameType.values();
			int num = array.Length;
			for (int i = 0; i < num; i++)
			{
				NameType nameType = array[i];
				EnumMap.__<clinit>();
				EnumMap enumMap = new EnumMap(ClassLiteral<RuleType>.Value);
				RuleType[] array2 = RuleType.values();
				int num2 = array2.Length;
				for (int j = 0; j < num2; j++)
				{
					RuleType ruleType = array2[j];
					HashMap hashMap = new HashMap();
					Languages instance = Languages.getInstance(nameType);
					Iterator iterator = instance.getLanguages().iterator();
					while (iterator.hasNext())
					{
						string text = (string)iterator.next();
						IllegalStateException ex2;
						try
						{
							((Map)hashMap).put(text, Rule.parseRules(Rule.createScanner(nameType, ruleType, text), Rule.createResourceName(nameType, ruleType, text)));
						}
						catch (IllegalStateException ex)
						{
							ex2 = ByteCodeHelper.MapException<IllegalStateException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
							goto IL_00CE;
						}
						continue;
						IL_00CE:
						IllegalStateException ex3 = ex2;
						string text2 = new StringBuilder().append("Problem processing ").append(Rule.createResourceName(nameType, ruleType, text)).toString();
						Exception ex4 = ex3;
						Throwable.__<suppressFillInStackTrace>();
						throw new IllegalStateException(text2, ex4);
					}
					if (!ruleType.equals(RuleType.__<>RULES))
					{
						((Map)hashMap).put("common", Rule.parseRules(Rule.createScanner(nameType, ruleType, "common"), Rule.createResourceName(nameType, ruleType, "common")));
					}
					((Map)enumMap).put(ruleType, Collections.unmodifiableMap(hashMap));
				}
				Rule.RULES.put(nameType, Collections.unmodifiableMap(enumMap));
			}
		}

		// Token: 0x060002D0 RID: 720 RVA: 0x0001024C File Offset: 0x0000E44C
		private static CallerID __<GetCallerID>()
		{
			if (Rule.__<callerID> == null)
			{
				Rule.__<callerID> = new Rule.__<CallerID>();
			}
			return Rule.__<callerID>;
		}

		// Token: 0x17000011 RID: 17
		// (get) Token: 0x060002D1 RID: 721 RVA: 0x00010264 File Offset: 0x0000E464
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Rule.RPattern ALL_STRINGS_RMATCHER
		{
			[HideFromJava]
			get
			{
				return Rule.__<>ALL_STRINGS_RMATCHER;
			}
		}

		// Token: 0x04000116 RID: 278
		internal static Rule.RPattern __<>ALL_STRINGS_RMATCHER = new Rule$1();

		// Token: 0x04000117 RID: 279
		public const string ALL = "ALL";

		// Token: 0x04000118 RID: 280
		private const string DOUBLE_QUOTE = "\"";

		// Token: 0x04000119 RID: 281
		private const string HASH_INCLUDE = "#include";

		// Token: 0x0400011A RID: 282
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[Signature("Ljava/util/Map<Lcom/edc/classbook/util/codec/language/bm/NameType;Ljava/util/Map<Lcom/edc/classbook/util/codec/language/bm/RuleType;Ljava/util/Map<Ljava/lang/String;Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;>;>;>;")]
		private static Map RULES;

		// Token: 0x0400011B RID: 283
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Rule.RPattern lContext;

		// Token: 0x0400011C RID: 284
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private string pattern;

		// Token: 0x0400011D RID: 285
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Rule.PhonemeExpr phoneme;

		// Token: 0x0400011E RID: 286
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Rule.RPattern rContext;

		// Token: 0x0400011F RID: 287
		private static CallerID __<callerID>;

		// Token: 0x02000054 RID: 84
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$PhonemeExpr" })]
		[SourceFile("Rule.java")]
		public sealed class Phoneme : Object, Rule.PhonemeExpr
		{
			// Token: 0x060002D2 RID: 722 RVA: 0x0001073E File Offset: 0x0000E93E
			[MethodImpl(8)]
			public static void __<clinit>()
			{
			}

			// Token: 0x060002D3 RID: 723 RVA: 0x00010740 File Offset: 0x0000E940
			public Languages.LanguageSet getLanguages()
			{
				return this.languages;
			}

			// Token: 0x060002D4 RID: 724 RVA: 0x00010748 File Offset: 0x0000E948
			public CharSequence getPhonemeText()
			{
				CharSequence charSequence = this.phonemeText;
				object _<ref> = charSequence.__<ref>;
				CharSequence charSequence2;
				charSequence2.__<ref> = _<ref>;
				return charSequence2;
			}

			// Token: 0x060002D5 RID: 725 RVA: 0x00010774 File Offset: 0x0000E974
			[LineNumberTable(new byte[] { 159, 116, 170, 104, 119, 103 })]
			[MethodImpl(8)]
			public Phoneme(CharSequence phonemeText, Languages.LanguageSet languages)
			{
				CharSequence charSequence = phonemeText;
				object _<ref> = charSequence.__<ref>;
				base..ctor();
				object obj = _<ref>;
				CharSequence charSequence2;
				charSequence2.__<ref> = obj;
				this.phonemeText = charSequence2;
				this.languages = languages;
			}

			// Token: 0x060002D6 RID: 726 RVA: 0x000107B4 File Offset: 0x0000E9B4
			[LineNumberTable(113)]
			[MethodImpl(8)]
			public Rule.Phoneme append(CharSequence str)
			{
				CharSequence charSequence = str;
				object _<ref> = charSequence.__<ref>;
				StringBuilder stringBuilder = new StringBuilder();
				CharSequence charSequence2 = this.phonemeText;
				object obj = stringBuilder.append(Object.instancehelper_toString(charSequence2.__<ref>)).append(Object.instancehelper_toString(_<ref>)).toString();
				Languages.LanguageSet languageSet = this.languages;
				object obj2 = obj;
				CharSequence charSequence3;
				charSequence3.__<ref> = obj2;
				return new Rule.Phoneme(charSequence3, languageSet);
			}

			// Token: 0x060002D7 RID: 727 RVA: 0x0001081C File Offset: 0x0000EA1C
			[LineNumberTable(130)]
			[MethodImpl(8)]
			public Rule.Phoneme join(Rule.Phoneme right)
			{
				StringBuilder stringBuilder = new StringBuilder();
				CharSequence charSequence = this.phonemeText;
				StringBuilder stringBuilder2 = stringBuilder.append(Object.instancehelper_toString(charSequence.__<ref>));
				CharSequence charSequence2 = right.phonemeText;
				object obj = stringBuilder2.append(Object.instancehelper_toString(charSequence2.__<ref>)).toString();
				Languages.LanguageSet languageSet = this.languages.restrictTo(right.languages);
				object obj2 = obj;
				CharSequence charSequence3;
				charSequence3.__<ref> = obj2;
				return new Rule.Phoneme(charSequence3, languageSet);
			}

			// Token: 0x060002D8 RID: 728 RVA: 0x00010890 File Offset: 0x0000EA90
			[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
			[LineNumberTable(82)]
			internal static CharSequence access$000(Rule.Phoneme A_0)
			{
				CharSequence charSequence = A_0.phonemeText;
				object _<ref> = charSequence.__<ref>;
				CharSequence charSequence2;
				charSequence2.__<ref> = _<ref>;
				return charSequence2;
			}

			// Token: 0x060002D9 RID: 729 RVA: 0x000108BB File Offset: 0x0000EABB
			[Signature("()Ljava/lang/Iterable<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			[LineNumberTable(122)]
			[MethodImpl(8)]
			public Iterable getPhonemes()
			{
				return Collections.singleton(this);
			}

			// Token: 0x17000012 RID: 18
			// (get) Token: 0x060002DB RID: 731 RVA: 0x000108D1 File Offset: 0x0000EAD1
			[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
			public static Comparator COMPARATOR
			{
				[HideFromJava]
				get
				{
					return Rule.Phoneme.__<>COMPARATOR;
				}
			}

			// Token: 0x04000120 RID: 288
			[Signature("Ljava/util/Comparator<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			internal static Comparator __<>COMPARATOR = new Rule$Phoneme$1();

			// Token: 0x04000121 RID: 289
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private CharSequence phonemeText;

			// Token: 0x04000122 RID: 290
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private Languages.LanguageSet languages;
		}

		// Token: 0x02000055 RID: 85
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Interface | Modifiers.Abstract)]
		[SourceFile("Rule.java")]
		public interface PhonemeExpr
		{
			// Token: 0x060002DC RID: 732
			[Signature("()Ljava/lang/Iterable<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			Iterable getPhonemes();
		}

		// Token: 0x02000056 RID: 86
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[Implements(new string[] { "com.edc.classbook.util.codec.language.bm.Rule$PhonemeExpr" })]
		[SourceFile("Rule.java")]
		public sealed class PhonemeList : Object, Rule.PhonemeExpr
		{
			// Token: 0x060002DD RID: 733 RVA: 0x000108D8 File Offset: 0x0000EAD8
			[Signature("(Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;)V")]
			[LineNumberTable(new byte[] { 92, 104, 103 })]
			[MethodImpl(8)]
			public PhonemeList(List phonemes)
			{
				this.phonemes = phonemes;
			}

			// Token: 0x060002DE RID: 734 RVA: 0x000108F4 File Offset: 0x0000EAF4
			[Signature("()Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			public List getPhonemes()
			{
				return this.phonemes;
			}

			// Token: 0x060002DF RID: 735 RVA: 0x000108FC File Offset: 0x0000EAFC
			[Modifiers(Modifiers.Public | Modifiers.Volatile | Modifiers.Synthetic)]
			[EditorBrowsable(1)]
			[LineNumberTable(139)]
			[MethodImpl(8)]
			public Iterable <bridge>getPhonemes()
			{
				return this.getPhonemes();
			}

			// Token: 0x060002E0 RID: 736 RVA: 0x00010906 File Offset: 0x0000EB06
			[HideFromJava]
			Iterable Rule.PhonemeExpr.Iterable;getPhonemes()
			{
				return this.<bridge>getPhonemes();
			}

			// Token: 0x04000123 RID: 291
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			[Signature("Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			private List phonemes;
		}

		// Token: 0x02000057 RID: 87
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Interface | Modifiers.Abstract)]
		[SourceFile("Rule.java")]
		public interface RPattern
		{
			// Token: 0x060002E1 RID: 737
			bool isMatch(CharSequence cs);
		}

		// Token: 0x0200006B RID: 107
		private sealed class __<CallerID> : CallerID
		{
			// Token: 0x0600039D RID: 925 RVA: 0x0001026B File Offset: 0x0000E46B
			internal __<CallerID>()
			{
			}
		}
	}
}
