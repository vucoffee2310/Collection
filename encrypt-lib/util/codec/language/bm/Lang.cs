using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using java.io;
using java.lang;
using java.util;
using java.util.regex;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000038 RID: 56
	public class Lang : Object
	{
		// Token: 0x0600023C RID: 572 RVA: 0x0000DEB8 File Offset: 0x0000C0B8
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x0600023D RID: 573 RVA: 0x0000DEBC File Offset: 0x0000C0BC
		[Signature("(Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Lang$LangRule;>;Lcom/edc/classbook/util/codec/language/bm/Languages;)V")]
		[LineNumberTable(new byte[] { 160, 74, 104, 108, 103 })]
		[MethodImpl(8)]
		private Lang(List A_1, Languages A_2)
		{
			this.rules = Collections.unmodifiableList(A_1);
			this.languages = A_2;
		}

		// Token: 0x0600023E RID: 574 RVA: 0x0000DEE4 File Offset: 0x0000C0E4
		[LineNumberTable(new byte[]
		{
			160, 99, 140, 118, 127, 1, 105, 104, 143, 239,
			69, 104
		})]
		[MethodImpl(8)]
		public virtual Languages.LanguageSet guessLanguages(string input)
		{
			string text = String.instancehelper_toLowerCase(input, Locale.ENGLISH);
			HashSet.__<clinit>();
			HashSet hashSet = new HashSet(this.languages.getLanguages());
			Iterator iterator = this.rules.iterator();
			while (iterator.hasNext())
			{
				Lang.LangRule langRule = (Lang.LangRule)iterator.next();
				if (langRule.matches(text))
				{
					if (Lang.LangRule.access$100(langRule))
					{
						((Set)hashSet).retainAll(Lang.LangRule.access$200(langRule));
					}
					else
					{
						((Set)hashSet).removeAll(Lang.LangRule.access$200(langRule));
					}
				}
			}
			Languages.LanguageSet languageSet = Languages.LanguageSet.from(hashSet);
			return (!Object.instancehelper_equals(languageSet, Languages.__<>NO_LANGUAGES)) ? languageSet : Languages.__<>ANY_LANGUAGE;
		}

		// Token: 0x0600023F RID: 575 RVA: 0x0000DF84 File Offset: 0x0000C184
		[LineNumberTable(new byte[]
		{
			80, 102, 150, 99, 176, 108, 98, 107, 104, 132,
			131, 113, 167, 110, 167, 110, 101, 204, 137, 105,
			197, 142, 102, 223, 33, 107, 112, 144, 191, 3,
			133
		})]
		[MethodImpl(8)]
		public static Lang loadFromResource(string languageRulesResourceName, Languages languages)
		{
			ArrayList arrayList = new ArrayList();
			InputStream resourceAsStream = ClassLiteral<Lang>.Value.getClassLoader(Lang.__<GetCallerID>()).getResourceAsStream(languageRulesResourceName);
			if (resourceAsStream == null)
			{
				string text = "Unable to resolve required resource:org/apache/commons/codec/language/bm/lang.txt";
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalStateException(text);
			}
			Scanner scanner = new Scanner(resourceAsStream, "UTF-8");
			int num = 0;
			while (scanner.hasNextLine())
			{
				string text2 = scanner.nextLine();
				string text3 = text2;
				if (num != 0)
				{
					if (String.instancehelper_endsWith(text3, "*/"))
					{
						num = 0;
					}
				}
				else if (String.instancehelper_startsWith(text3, "/*"))
				{
					num = 1;
				}
				else
				{
					int num2 = String.instancehelper_indexOf(text3, "//");
					if (num2 >= 0)
					{
						text3 = String.instancehelper_substring(text3, 0, num2);
					}
					text3 = String.instancehelper_trim(text3);
					if (String.instancehelper_length(text3) != 0)
					{
						string[] array = String.instancehelper_split(text3, "\\s+");
						if (array.Length != 3)
						{
							string text4 = new StringBuilder().append("Malformed line '").append(text2).append("' in language resource '")
								.append(languageRulesResourceName)
								.append("'")
								.toString();
							Throwable.__<suppressFillInStackTrace>();
							throw new IllegalArgumentException(text4);
						}
						Pattern pattern = Pattern.compile(array[0]);
						string[] array2 = String.instancehelper_split(array[1], "\\+");
						int num3 = (String.instancehelper_equals(array[2], "true") ? 1 : 0);
						List list = arrayList;
						Pattern pattern2 = pattern;
						HashSet.__<clinit>();
						list.add(new Lang.LangRule(pattern2, new HashSet(Arrays.asList(array2)), num3 != 0, null));
					}
				}
			}
			return new Lang(arrayList, languages);
		}

		// Token: 0x06000240 RID: 576 RVA: 0x0000E0FA File Offset: 0x0000C2FA
		[LineNumberTable(114)]
		[MethodImpl(8)]
		public static Lang instance(NameType nameType)
		{
			return (Lang)Lang.Langs.get(nameType);
		}

		// Token: 0x06000241 RID: 577 RVA: 0x0000E10C File Offset: 0x0000C30C
		[LineNumberTable(new byte[] { 160, 87, 104 })]
		[MethodImpl(8)]
		public virtual string guessLanguage(string text)
		{
			Languages.LanguageSet languageSet = this.guessLanguages(text);
			return (!languageSet.isSingleton()) ? "any" : languageSet.getAny();
		}

		// Token: 0x06000242 RID: 578 RVA: 0x0000E138 File Offset: 0x0000C338
		[LineNumberTable(new byte[] { 46, 244, 69, 115, 60, 166 })]
		static Lang()
		{
			EnumMap.__<clinit>();
			Lang.Langs = new EnumMap(ClassLiteral<NameType>.Value);
			NameType[] array = NameType.values();
			int num = array.Length;
			for (int i = 0; i < num; i++)
			{
				NameType nameType = array[i];
				Lang.Langs.put(nameType, Lang.loadFromResource("org/apache/commons/codec/language/bm/lang.txt", Languages.getInstance(nameType)));
			}
		}

		// Token: 0x06000243 RID: 579 RVA: 0x0000E18E File Offset: 0x0000C38E
		private static CallerID __<GetCallerID>()
		{
			if (Lang.__<callerID> == null)
			{
				Lang.__<callerID> = new Lang.__<CallerID>();
			}
			return Lang.__<callerID>;
		}

		// Token: 0x040000DA RID: 218
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[Signature("Ljava/util/Map<Lcom/edc/classbook/util/codec/language/bm/NameType;Lcom/edc/classbook/util/codec/language/bm/Lang;>;")]
		private static Map Langs;

		// Token: 0x040000DB RID: 219
		private const string LANGUAGE_RULES_RN = "org/apache/commons/codec/language/bm/lang.txt";

		// Token: 0x040000DC RID: 220
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Languages languages;

		// Token: 0x040000DD RID: 221
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		[Signature("Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Lang$LangRule;>;")]
		private List rules;

		// Token: 0x040000DE RID: 222
		private static CallerID __<callerID>;

		// Token: 0x02000039 RID: 57
		[InnerClass(null, Modifiers.Static | Modifiers.Synthetic)]
		[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Lang", null, null)]
		[SourceFile("Lang.java")]
		[Modifiers(Modifiers.Super | Modifiers.Synthetic)]
		internal sealed class 1 : Object
		{
			// Token: 0x06000244 RID: 580 RVA: 0x0000DEB5 File Offset: 0x0000C0B5
			1()
			{
				throw null;
			}
		}

		// Token: 0x0200003A RID: 58
		[InnerClass(null, Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[SourceFile("Lang.java")]
		internal sealed class LangRule : Object
		{
			// Token: 0x06000245 RID: 581 RVA: 0x0000E1B0 File Offset: 0x0000C3B0
			[Modifiers(Modifiers.Synthetic)]
			[LineNumberTable(80)]
			[MethodImpl(8)]
			internal LangRule(Pattern A_1, Set A_2, bool A_3, Lang.1 A_4)
				: this(A_1, A_2, A_3)
			{
			}

			// Token: 0x06000246 RID: 582 RVA: 0x0000E1CC File Offset: 0x0000C3CC
			[LineNumberTable(92)]
			[MethodImpl(8)]
			public bool matches(string A_1)
			{
				Pattern pattern = this.pattern;
				CharSequence charSequence;
				charSequence.__<ref> = A_1;
				return pattern.matcher(charSequence).find();
			}

			// Token: 0x06000247 RID: 583 RVA: 0x0000E1FC File Offset: 0x0000C3FC
			[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
			[LineNumberTable(80)]
			internal static bool access$100(Lang.LangRule A_0)
			{
				return A_0.acceptOnMatch;
			}

			// Token: 0x06000248 RID: 584 RVA: 0x0000E204 File Offset: 0x0000C404
			[Modifiers(Modifiers.Static | Modifiers.Synthetic)]
			[LineNumberTable(80)]
			internal static Set access$200(Lang.LangRule A_0)
			{
				return A_0.languages;
			}

			// Token: 0x06000249 RID: 585 RVA: 0x0000E20C File Offset: 0x0000C40C
			[Signature("(Ljava/util/regex/Pattern;Ljava/util/Set<Ljava/lang/String;>;Z)V")]
			[LineNumberTable(new byte[] { 159, 121, 98, 104, 103, 103, 103 })]
			[MethodImpl(8)]
			private LangRule(Pattern A_1, Set A_2, bool A_3)
			{
				this.pattern = A_1;
				this.languages = A_2;
				this.acceptOnMatch = A_3;
			}

			// Token: 0x040000DF RID: 223
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private bool acceptOnMatch;

			// Token: 0x040000E0 RID: 224
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			[Signature("Ljava/util/Set<Ljava/lang/String;>;")]
			private Set languages;

			// Token: 0x040000E1 RID: 225
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private Pattern pattern;
		}

		// Token: 0x02000069 RID: 105
		private sealed class __<CallerID> : CallerID
		{
			// Token: 0x0600039B RID: 923 RVA: 0x0000E1A6 File Offset: 0x0000C3A6
			internal __<CallerID>()
			{
			}
		}
	}
}
