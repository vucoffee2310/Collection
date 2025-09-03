using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x0200003D RID: 61
	public class Languages : Object
	{
		// Token: 0x06000258 RID: 600 RVA: 0x0000E2B8 File Offset: 0x0000C4B8
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000259 RID: 601 RVA: 0x0000E2BA File Offset: 0x0000C4BA
		[Signature("()Ljava/util/Set<Ljava/lang/String;>;")]
		public virtual Set getLanguages()
		{
			return this.languages;
		}

		// Token: 0x0600025A RID: 602 RVA: 0x0000E2C2 File Offset: 0x0000C4C2
		[LineNumberTable(148)]
		[MethodImpl(8)]
		public static Languages getInstance(NameType nameType)
		{
			return (Languages)Languages.LANGUAGES.get(nameType);
		}

		// Token: 0x0600025B RID: 603 RVA: 0x0000E2D4 File Offset: 0x0000C4D4
		[Signature("(Ljava/util/Set<Ljava/lang/String;>;)V")]
		[LineNumberTable(new byte[] { 160, 142, 104, 103 })]
		[MethodImpl(8)]
		private Languages(Set A_1)
		{
			this.languages = A_1;
		}

		// Token: 0x0600025C RID: 604 RVA: 0x0000E2F0 File Offset: 0x0000C4F0
		[LineNumberTable(181)]
		[MethodImpl(8)]
		private static string langResourceName(NameType A_0)
		{
			return String.format("org/apache/commons/codec/language/bm/%s_languages.txt", new object[] { A_0.getName() });
		}

		// Token: 0x0600025D RID: 605 RVA: 0x0000E310 File Offset: 0x0000C510
		[LineNumberTable(new byte[]
		{
			103, 102, 150, 99, 191, 6, 108, 98, 104, 109,
			99, 110, 164, 110, 100, 106, 169, 133
		})]
		[MethodImpl(8)]
		public static Languages getInstance(string languagesResourceName)
		{
			HashSet hashSet = new HashSet();
			InputStream resourceAsStream = ClassLiteral<Languages>.Value.getClassLoader(Languages.__<GetCallerID>()).getResourceAsStream(languagesResourceName);
			if (resourceAsStream == null)
			{
				string text = new StringBuilder().append("Unable to resolve required resource: ").append(languagesResourceName).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			Scanner scanner = new Scanner(resourceAsStream, "UTF-8");
			int num = 0;
			while (scanner.hasNextLine())
			{
				string text2 = String.instancehelper_trim(scanner.nextLine());
				if (num != 0)
				{
					if (String.instancehelper_endsWith(text2, "*/"))
					{
						num = 0;
					}
				}
				else if (String.instancehelper_startsWith(text2, "/*"))
				{
					num = 1;
				}
				else if (String.instancehelper_length(text2) > 0)
				{
					((Set)hashSet).add(text2);
				}
			}
			return new Languages(Collections.unmodifiableSet(hashSet));
		}

		// Token: 0x0600025E RID: 606 RVA: 0x0000E3D0 File Offset: 0x0000C5D0
		[LineNumberTable(new byte[] { 89, 180, 115, 55, 230, 111, 234, 99 })]
		static Languages()
		{
			EnumMap.__<clinit>();
			Languages.LANGUAGES = new EnumMap(ClassLiteral<NameType>.Value);
			NameType[] array = NameType.values();
			int num = array.Length;
			for (int i = 0; i < num; i++)
			{
				NameType nameType = array[i];
				Languages.LANGUAGES.put(nameType, Languages.getInstance(Languages.langResourceName(nameType)));
			}
			Languages.__<>NO_LANGUAGES = new Languages$1();
			Languages.__<>ANY_LANGUAGE = new Languages$2();
		}

		// Token: 0x0600025F RID: 607 RVA: 0x0000E435 File Offset: 0x0000C635
		private static CallerID __<GetCallerID>()
		{
			if (Languages.__<callerID> == null)
			{
				Languages.__<callerID> = new Languages.__<CallerID>();
			}
			return Languages.__<callerID>;
		}

		// Token: 0x1700000C RID: 12
		// (get) Token: 0x06000260 RID: 608 RVA: 0x0000E44D File Offset: 0x0000C64D
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Languages.LanguageSet NO_LANGUAGES
		{
			[HideFromJava]
			get
			{
				return Languages.__<>NO_LANGUAGES;
			}
		}

		// Token: 0x1700000D RID: 13
		// (get) Token: 0x06000261 RID: 609 RVA: 0x0000E454 File Offset: 0x0000C654
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		public static Languages.LanguageSet ANY_LANGUAGE
		{
			[HideFromJava]
			get
			{
				return Languages.__<>ANY_LANGUAGE;
			}
		}

		// Token: 0x040000E2 RID: 226
		public const string ANY = "any";

		// Token: 0x040000E3 RID: 227
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[Signature("Ljava/util/Map<Lcom/edc/classbook/util/codec/language/bm/NameType;Lcom/edc/classbook/util/codec/language/bm/Languages;>;")]
		private static Map LANGUAGES;

		// Token: 0x040000E4 RID: 228
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		[Signature("Ljava/util/Set<Ljava/lang/String;>;")]
		private Set languages;

		// Token: 0x040000E5 RID: 229
		internal static Languages.LanguageSet __<>NO_LANGUAGES;

		// Token: 0x040000E6 RID: 230
		internal static Languages.LanguageSet __<>ANY_LANGUAGE;

		// Token: 0x040000E7 RID: 231
		private static CallerID __<callerID>;

		// Token: 0x0200003E RID: 62
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Abstract)]
		[SourceFile("Languages.java")]
		public abstract class LanguageSet : Object
		{
			// Token: 0x06000262 RID: 610
			public abstract bool isSingleton();

			// Token: 0x06000263 RID: 611
			public abstract string getAny();

			// Token: 0x06000264 RID: 612 RVA: 0x0000E238 File Offset: 0x0000C438
			[Signature("(Ljava/util/Set<Ljava/lang/String;>;)Lcom/edc/classbook/util/codec/language/bm/Languages$LanguageSet;")]
			[LineNumberTable(64)]
			[MethodImpl(8)]
			public static Languages.LanguageSet from(Set langs)
			{
				return (!langs.isEmpty()) ? new Languages.SomeLanguages(langs, null) : Languages.__<>NO_LANGUAGES;
			}

			// Token: 0x06000265 RID: 613 RVA: 0x0000E252 File Offset: 0x0000C452
			[LineNumberTable(61)]
			[MethodImpl(8)]
			public LanguageSet()
			{
			}

			// Token: 0x06000266 RID: 614
			public abstract bool contains(string str);

			// Token: 0x06000267 RID: 615
			public abstract bool isEmpty();

			// Token: 0x06000268 RID: 616
			public abstract Languages.LanguageSet restrictTo(Languages.LanguageSet lls);
		}

		// Token: 0x0200003F RID: 63
		[InnerClass(null, Modifiers.Public | Modifiers.Static | Modifiers.Final)]
		[SourceFile("Languages.java")]
		public sealed class SomeLanguages : Languages.LanguageSet
		{
			// Token: 0x06000269 RID: 617 RVA: 0x0000E463 File Offset: 0x0000C663
			[Modifiers(Modifiers.Synthetic)]
			[LineNumberTable(81)]
			[MethodImpl(8)]
			internal SomeLanguages(Set A_1, Languages$1 A_2)
				: this(A_1)
			{
			}

			// Token: 0x0600026A RID: 618 RVA: 0x0000E470 File Offset: 0x0000C670
			[Signature("(Ljava/util/Set<Ljava/lang/String;>;)V")]
			[LineNumberTable(new byte[] { 34, 104, 108 })]
			[MethodImpl(8)]
			private SomeLanguages(Set A_1)
			{
				this.languages = Collections.unmodifiableSet(A_1);
			}

			// Token: 0x0600026B RID: 619 RVA: 0x0000E491 File Offset: 0x0000C691
			[LineNumberTable(90)]
			[MethodImpl(8)]
			public override bool contains(string language)
			{
				return this.languages.contains(language);
			}

			// Token: 0x0600026C RID: 620 RVA: 0x0000E4A1 File Offset: 0x0000C6A1
			[LineNumberTable(95)]
			[MethodImpl(8)]
			public override string getAny()
			{
				return (string)this.languages.iterator().next();
			}

			// Token: 0x0600026D RID: 621 RVA: 0x0000E4B8 File Offset: 0x0000C6B8
			[Signature("()Ljava/util/Set<Ljava/lang/String;>;")]
			public Set getLanguages()
			{
				return this.languages;
			}

			// Token: 0x0600026E RID: 622 RVA: 0x0000E4C0 File Offset: 0x0000C6C0
			[LineNumberTable(104)]
			[MethodImpl(8)]
			public override bool isEmpty()
			{
				return this.languages.isEmpty();
			}

			// Token: 0x0600026F RID: 623 RVA: 0x0000E4CF File Offset: 0x0000C6CF
			[LineNumberTable(109)]
			[MethodImpl(8)]
			public override bool isSingleton()
			{
				return this.languages.size() == 1;
			}

			// Token: 0x06000270 RID: 624 RVA: 0x0000E4E0 File Offset: 0x0000C6E0
			[LineNumberTable(new byte[] { 64, 104, 98, 104, 130, 103, 115, 130, 113, 109 })]
			[MethodImpl(8)]
			public override Languages.LanguageSet restrictTo(Languages.LanguageSet other)
			{
				if (other == Languages.__<>NO_LANGUAGES)
				{
					return other;
				}
				if (other == Languages.__<>ANY_LANGUAGE)
				{
					return this;
				}
				Languages.SomeLanguages someLanguages = (Languages.SomeLanguages)other;
				if (someLanguages.languages.containsAll(this.languages))
				{
					return this;
				}
				HashSet.__<clinit>();
				HashSet hashSet = new HashSet(this.languages);
				((Set)hashSet).retainAll(someLanguages.languages);
				return Languages.LanguageSet.from(hashSet);
			}

			// Token: 0x06000271 RID: 625 RVA: 0x0000E543 File Offset: 0x0000C743
			[LineNumberTable(132)]
			[MethodImpl(8)]
			public override string toString()
			{
				return new StringBuilder().append("Languages(").append(Object.instancehelper_toString(this.languages)).append(")")
					.toString();
			}

			// Token: 0x040000E8 RID: 232
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			[Signature("Ljava/util/Set<Ljava/lang/String;>;")]
			private Set languages;
		}

		// Token: 0x0200006A RID: 106
		private sealed class __<CallerID> : CallerID
		{
			// Token: 0x0600039C RID: 924 RVA: 0x0000E45B File Offset: 0x0000C65B
			internal __<CallerID>()
			{
			}
		}
	}
}
