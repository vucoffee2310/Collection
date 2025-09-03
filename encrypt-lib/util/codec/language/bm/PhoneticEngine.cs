using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000043 RID: 67
	public class PhoneticEngine : Object
	{
		// Token: 0x06000280 RID: 640 RVA: 0x0000E847 File Offset: 0x0000CA47
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000281 RID: 641 RVA: 0x0000E84C File Offset: 0x0000CA4C
		[LineNumberTable(new byte[] { 159, 61, 66, 109 })]
		[MethodImpl(8)]
		public PhoneticEngine(NameType nameType, RuleType ruleType, bool concat)
			: this(nameType, ruleType, concat, 20)
		{
		}

		// Token: 0x06000282 RID: 642 RVA: 0x0000E868 File Offset: 0x0000CA68
		[LineNumberTable(new byte[] { 161, 31, 109 })]
		[MethodImpl(8)]
		public virtual string encode(string input)
		{
			Languages.LanguageSet languageSet = this.lang.guessLanguages(input);
			return this.encode(input, languageSet);
		}

		// Token: 0x06000283 RID: 643 RVA: 0x0000E88C File Offset: 0x0000CA8C
		public virtual NameType getNameType()
		{
			return this.nameType;
		}

		// Token: 0x06000284 RID: 644 RVA: 0x0000E894 File Offset: 0x0000CA94
		public virtual RuleType getRuleType()
		{
			return this.ruleType;
		}

		// Token: 0x06000285 RID: 645 RVA: 0x0000E89C File Offset: 0x0000CA9C
		public virtual bool isConcat()
		{
			return this.concat;
		}

		// Token: 0x06000286 RID: 646 RVA: 0x0000E8A4 File Offset: 0x0000CAA4
		public virtual int getMaxPhonemes()
		{
			return this.maxPhonemes;
		}

		// Token: 0x06000287 RID: 647 RVA: 0x0000E8AC File Offset: 0x0000CAAC
		[LineNumberTable(new byte[]
		{
			159, 57, 66, 104, 104, 159, 10, 103, 103, 103,
			108, 104
		})]
		[MethodImpl(8)]
		public PhoneticEngine(NameType nameType, RuleType ruleType, bool concat, int maxPhonemes)
		{
			if (ruleType == RuleType.__<>RULES)
			{
				string text = new StringBuilder().append("ruleType must not be ").append(RuleType.__<>RULES).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			this.nameType = nameType;
			this.ruleType = ruleType;
			this.concat = concat;
			this.lang = Lang.instance(nameType);
			this.maxPhonemes = maxPhonemes;
		}

		// Token: 0x06000288 RID: 648 RVA: 0x0000E920 File Offset: 0x0000CB20
		[LineNumberTable(new byte[] { 159, 79, 138, 127, 46 })]
		[MethodImpl(8)]
		private static CharSequence cacheSubSequence(CharSequence A_0)
		{
			CharSequence charSequence = A_0;
			object _<ref> = charSequence.__<ref>;
			object obj = _<ref>;
			CharSequence charSequence2;
			charSequence2.__<ref> = obj;
			int num = charSequence2.length();
			obj = _<ref>;
			charSequence2.__<ref> = obj;
			int num2 = charSequence2.length();
			int[] array = new int[2];
			int num3 = num2;
			array[1] = num3;
			num3 = num;
			array[0] = num3;
			object[][] array2 = (object[][])ByteCodeHelper.multianewarray_ghost(typeof(CharSequence[][]).TypeHandle, array);
			object obj2 = _<ref>;
			object[][] array3 = array2;
			obj = obj2;
			charSequence2.__<ref> = obj;
			object obj3 = new PhoneticEngine$1(charSequence2, array3);
			CharSequence charSequence3;
			charSequence3.__<ref> = obj3;
			return charSequence3;
		}

		// Token: 0x06000289 RID: 649 RVA: 0x0000E9B4 File Offset: 0x0000CBB4
		[LineNumberTable(new byte[]
		{
			161, 45, 146, 151, 211, 155, 112, 127, 1, 104,
			124, 159, 37, 159, 23, 159, 7, 113, 122, 255,
			43, 69, 114, 167, 159, 10, 127, 1, 110, 106,
			106, 98, 125, 130, 106, 125, 130, 106, 130, 191,
			11, 136, 115, 138, 181, 103, 127, 1, 188, 171,
			168, 127, 4, 123, 159, 24, 105, 105, 165, 139,
			139
		})]
		[MethodImpl(8)]
		public virtual string encode(string input, Languages.LanguageSet languageSet)
		{
			List instance = Rule.getInstance(this.nameType, RuleType.__<>RULES, languageSet);
			List instance2 = Rule.getInstance(this.nameType, this.ruleType, "common");
			List instance3 = Rule.getInstance(this.nameType, this.ruleType, languageSet);
			input = String.instancehelper_trim(String.instancehelper_replace(String.instancehelper_toLowerCase(input, Locale.ENGLISH), '-', ' '));
			if (this.nameType == NameType.__<>GENERIC)
			{
				if (String.instancehelper_length(input) >= 2 && String.instancehelper_equals(String.instancehelper_substring(input, 0, 2), "d'"))
				{
					string text = String.instancehelper_substring(input, 2);
					string text2 = new StringBuilder().append("d").append(text).toString();
					return new StringBuilder().append("(").append(this.encode(text)).append(")-(")
						.append(this.encode(text2))
						.append(")")
						.toString();
				}
				Iterator iterator = ((Set)PhoneticEngine.NAME_PREFIXES.get(this.nameType)).iterator();
				while (iterator.hasNext())
				{
					string text2 = (string)iterator.next();
					if (String.instancehelper_startsWith(input, new StringBuilder().append(text2).append(" ").toString()))
					{
						string text3 = String.instancehelper_substring(input, String.instancehelper_length(text2) + 1);
						string text4 = new StringBuilder().append(text2).append(text3).toString();
						return new StringBuilder().append("(").append(this.encode(text3)).append(")-(")
							.append(this.encode(text4))
							.append(")")
							.toString();
					}
				}
			}
			List list = Arrays.asList(String.instancehelper_split(input, "\\s+"));
			ArrayList arrayList = new ArrayList();
			switch (PhoneticEngine.2.$SwitchMap$com$edc$classbook$util$codec$language$bm$NameType[this.nameType.ordinal()])
			{
			case 1:
			{
				Iterator iterator2 = list.iterator();
				while (iterator2.hasNext())
				{
					string text4 = (string)iterator2.next();
					string[] array = String.instancehelper_split(text4, "'");
					string text5 = array[array.Length - 1];
					((List)arrayList).add(text5);
				}
				((List)arrayList).removeAll((Collection)PhoneticEngine.NAME_PREFIXES.get(this.nameType));
				break;
			}
			case 2:
				((List)arrayList).addAll(list);
				((List)arrayList).removeAll((Collection)PhoneticEngine.NAME_PREFIXES.get(this.nameType));
				break;
			case 3:
				((List)arrayList).addAll(list);
				break;
			default:
			{
				string text6 = new StringBuilder().append("Unreachable case: ").append(this.nameType).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalStateException(text6);
			}
			}
			if (this.concat)
			{
				input = PhoneticEngine.join(arrayList, " ");
			}
			else
			{
				if (((List)arrayList).size() != 1)
				{
					StringBuilder stringBuilder = new StringBuilder();
					Iterator iterator3 = ((List)arrayList).iterator();
					while (iterator3.hasNext())
					{
						string text7 = (string)iterator3.next();
						stringBuilder.append("-").append(this.encode(text7));
					}
					return stringBuilder.substring(1);
				}
				input = (string)list.iterator().next();
			}
			PhoneticEngine.PhonemeBuilder phonemeBuilder = PhoneticEngine.PhonemeBuilder.empty(languageSet);
			object obj = input;
			CharSequence charSequence;
			charSequence.__<ref> = obj;
			object _<ref> = PhoneticEngine.cacheSubSequence(charSequence).__<ref>;
			int num = 0;
			for (;;)
			{
				int num2 = num;
				obj = _<ref>;
				charSequence.__<ref> = obj;
				if (num2 >= charSequence.length())
				{
					break;
				}
				List list2 = instance;
				object obj2 = _<ref>;
				PhoneticEngine.PhonemeBuilder phonemeBuilder2 = phonemeBuilder;
				int num3 = num;
				int num4 = this.maxPhonemes;
				int num5 = num3;
				PhoneticEngine.PhonemeBuilder phonemeBuilder3 = phonemeBuilder2;
				obj = obj2;
				charSequence.__<ref> = obj;
				PhoneticEngine.RulesApplication rulesApplication = new PhoneticEngine.RulesApplication(list2, charSequence, phonemeBuilder3, num5, num4).invoke();
				num = rulesApplication.getI();
				phonemeBuilder = rulesApplication.getPhonemeBuilder();
			}
			phonemeBuilder = this.applyFinalRules(phonemeBuilder, instance2);
			phonemeBuilder = this.applyFinalRules(phonemeBuilder, instance3);
			return phonemeBuilder.makeString();
		}

		// Token: 0x0600028A RID: 650 RVA: 0x0000EDC0 File Offset: 0x0000CFC0
		[Signature("(Ljava/lang/Iterable<Ljava/lang/String;>;Ljava/lang/String;)Ljava/lang/String;")]
		[LineNumberTable(new byte[] { 160, 175, 102, 103, 104, 146, 104, 186 })]
		[MethodImpl(8)]
		private static string join(Iterable A_0, string A_1)
		{
			StringBuilder stringBuilder = new StringBuilder();
			Iterator iterator = A_0.iterator();
			if (iterator.hasNext())
			{
				stringBuilder.append((string)iterator.next());
			}
			while (iterator.hasNext())
			{
				stringBuilder.append(A_1).append((string)iterator.next());
			}
			return stringBuilder.toString();
		}

		// Token: 0x0600028B RID: 651 RVA: 0x0000EE20 File Offset: 0x0000D020
		[Signature("(Lcom/edc/classbook/util/codec/language/bm/PhoneticEngine$PhonemeBuilder;Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;)Lcom/edc/classbook/util/codec/language/bm/PhoneticEngine$PhonemeBuilder;")]
		[LineNumberTable(new byte[]
		{
			160, 246, 99, 144, 104, 162, 144, 127, 4, 108,
			159, 18, 126, 159, 23, 105, 136, 132, 191, 37,
			105, 133, 109, 133
		})]
		[MethodImpl(8)]
		private PhoneticEngine.PhonemeBuilder applyFinalRules(PhoneticEngine.PhonemeBuilder A_1, List A_2)
		{
			if (A_2 == null)
			{
				string text = "finalRules can not be null";
				Throwable.__<suppressFillInStackTrace>();
				throw new NullPointerException(text);
			}
			if (A_2.isEmpty())
			{
				return A_1;
			}
			TreeSet.__<clinit>();
			TreeSet treeSet = new TreeSet(Rule.Phoneme.__<>COMPARATOR);
			Iterator iterator = A_1.getPhonemes().iterator();
			while (iterator.hasNext())
			{
				Rule.Phoneme phoneme = (Rule.Phoneme)iterator.next();
				PhoneticEngine.PhonemeBuilder phonemeBuilder = PhoneticEngine.PhonemeBuilder.empty(phoneme.getLanguages());
				object obj = phoneme.getPhonemeText().__<ref>;
				CharSequence charSequence;
				charSequence.__<ref> = obj;
				object _<ref> = PhoneticEngine.cacheSubSequence(charSequence).__<ref>;
				int num = 0;
				for (;;)
				{
					int num2 = num;
					obj = _<ref>;
					charSequence.__<ref> = obj;
					if (num2 >= charSequence.length())
					{
						break;
					}
					object obj2 = _<ref>;
					PhoneticEngine.PhonemeBuilder phonemeBuilder2 = phonemeBuilder;
					int num3 = num;
					int num4 = this.maxPhonemes;
					int num5 = num3;
					PhoneticEngine.PhonemeBuilder phonemeBuilder3 = phonemeBuilder2;
					obj = obj2;
					charSequence.__<ref> = obj;
					PhoneticEngine.RulesApplication rulesApplication = new PhoneticEngine.RulesApplication(A_2, charSequence, phonemeBuilder3, num5, num4).invoke();
					int num6 = (rulesApplication.isFound() ? 1 : 0);
					phonemeBuilder = rulesApplication.getPhonemeBuilder();
					if (num6 == 0)
					{
						PhoneticEngine.PhonemeBuilder phonemeBuilder4 = phonemeBuilder;
						object obj3 = _<ref>;
						int num7 = num;
						num4 = num + 1;
						num5 = num7;
						obj = obj3;
						charSequence.__<ref> = obj;
						obj = charSequence.subSequence(num5, num4).__<ref>;
						charSequence.__<ref> = obj;
						phonemeBuilder = phonemeBuilder4.append(charSequence);
					}
					num = rulesApplication.getI();
				}
				((Set)treeSet).addAll(phonemeBuilder.getPhonemes());
			}
			return new PhoneticEngine.PhonemeBuilder(treeSet, null);
		}

		// Token: 0x0600028C RID: 652 RVA: 0x0000EF90 File Offset: 0x0000D190
		public virtual Lang getLang()
		{
			return this.lang;
		}

		// Token: 0x0600028D RID: 653 RVA: 0x0000EF98 File Offset: 0x0000D198
		[LineNumberTable(new byte[]
		{
			160, 116, 180, 191, 59, 223, 160, 83, 223, 160,
			65
		})]
		static PhoneticEngine()
		{
			EnumMap.__<clinit>();
			PhoneticEngine.NAME_PREFIXES = new EnumMap(ClassLiteral<NameType>.Value);
			Map name_PREFIXES = PhoneticEngine.NAME_PREFIXES;
			object _<>ASHKENAZI = NameType.__<>ASHKENAZI;
			HashSet.__<clinit>();
			name_PREFIXES.put(_<>ASHKENAZI, Collections.unmodifiableSet(new HashSet(Arrays.asList(new string[] { "bar", "ben", "da", "de", "van", "von" }))));
			Map name_PREFIXES2 = PhoneticEngine.NAME_PREFIXES;
			object _<>SEPHARDIC = NameType.__<>SEPHARDIC;
			HashSet.__<clinit>();
			name_PREFIXES2.put(_<>SEPHARDIC, Collections.unmodifiableSet(new HashSet(Arrays.asList(new string[]
			{
				"al", "el", "da", "dal", "de", "del", "dela", "de la", "della", "des",
				"di", "do", "dos", "du", "van", "von"
			}))));
			Map name_PREFIXES3 = PhoneticEngine.NAME_PREFIXES;
			object _<>GENERIC = NameType.__<>GENERIC;
			HashSet.__<clinit>();
			name_PREFIXES3.put(_<>GENERIC, Collections.unmodifiableSet(new HashSet(Arrays.asList(new string[]
			{
				"da", "dal", "de", "del", "dela", "de la", "della", "des", "di", "do",
				"dos", "du", "van", "von"
			}))));
		}

		// Token: 0x040000F4 RID: 244
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[Signature("Ljava/util/Map<Lcom/edc/classbook/util/codec/language/bm/NameType;Ljava/util/Set<Ljava/lang/String;>;>;")]
		private static Map NAME_PREFIXES;

		// Token: 0x040000F5 RID: 245
		private const int DEFAULT_MAX_PHONEMES = 20;

		// Token: 0x040000F6 RID: 246
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private Lang lang;

		// Token: 0x040000F7 RID: 247
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private NameType nameType;

		// Token: 0x040000F8 RID: 248
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private RuleType ruleType;

		// Token: 0x040000F9 RID: 249
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private bool concat;

		// Token: 0x040000FA RID: 250
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private int maxPhonemes;

		// Token: 0x02000044 RID: 68
		[InnerClass(null, Modifiers.Static | Modifiers.Synthetic)]
		[EnclosingMethod("com.edc.classbook.util.codec.language.bm.PhoneticEngine", null, null)]
		[SourceFile("PhoneticEngine.java")]
		[Modifiers(Modifiers.Super | Modifiers.Synthetic)]
		internal sealed class 2 : Object
		{
			// Token: 0x0600028E RID: 654 RVA: 0x0000E77F File Offset: 0x0000C97F
			[MethodImpl(8)]
			public static void __<clinit>()
			{
			}

			// Token: 0x0600028F RID: 655 RVA: 0x0000E784 File Offset: 0x0000C984
			[LineNumberTable(446)]
			static 2()
			{
				try
				{
					PhoneticEngine.2.$SwitchMap$com$edc$classbook$util$codec$language$bm$NameType[NameType.__<>SEPHARDIC.ordinal()] = 1;
				}
				catch (Exception ex)
				{
					if (ByteCodeHelper.MapException<NoSuchFieldError>(ex, ByteCodeHelper.MapFlags.Unused) == null)
					{
						throw;
					}
				}
				try
				{
					PhoneticEngine.2.$SwitchMap$com$edc$classbook$util$codec$language$bm$NameType[NameType.__<>ASHKENAZI.ordinal()] = 2;
				}
				catch (Exception ex2)
				{
					if (ByteCodeHelper.MapException<NoSuchFieldError>(ex2, ByteCodeHelper.MapFlags.Unused) == null)
					{
						throw;
					}
				}
				try
				{
					PhoneticEngine.2.$SwitchMap$com$edc$classbook$util$codec$language$bm$NameType[NameType.__<>GENERIC.ordinal()] = 3;
				}
				catch (Exception ex3)
				{
					if (ByteCodeHelper.MapException<NoSuchFieldError>(ex3, ByteCodeHelper.MapFlags.Unused) == null)
					{
						throw;
					}
				}
			}

			// Token: 0x06000290 RID: 656 RVA: 0x0000E844 File Offset: 0x0000CA44
			2()
			{
				throw null;
			}

			// Token: 0x040000FB RID: 251
			[Modifiers(Modifiers.Static | Modifiers.Final | Modifiers.Synthetic)]
			internal static int[] $SwitchMap$com$edc$classbook$util$codec$language$bm$NameType = new int[NameType.values().Length];
		}

		// Token: 0x02000045 RID: 69
		[InnerClass(null, Modifiers.Static | Modifiers.Final)]
		[SourceFile("PhoneticEngine.java")]
		internal sealed class PhonemeBuilder : Object
		{
			// Token: 0x06000291 RID: 657 RVA: 0x0000F165 File Offset: 0x0000D365
			[Signature("()Ljava/util/Set<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			public Set getPhonemes()
			{
				return this.phonemes;
			}

			// Token: 0x06000292 RID: 658 RVA: 0x0000F170 File Offset: 0x0000D370
			[LineNumberTable(68)]
			[MethodImpl(8)]
			public static PhoneticEngine.PhonemeBuilder empty(Languages.LanguageSet A_0)
			{
				object obj = "";
				CharSequence charSequence;
				charSequence.__<ref> = obj;
				return new PhoneticEngine.PhonemeBuilder(Collections.singleton(new Rule.Phoneme(charSequence, A_0)));
			}

			// Token: 0x06000293 RID: 659 RVA: 0x0000F1A8 File Offset: 0x0000D3A8
			[LineNumberTable(new byte[] { 159, 121, 74, 134, 127, 2, 191, 4 })]
			[MethodImpl(8)]
			public PhoneticEngine.PhonemeBuilder append(CharSequence A_1)
			{
				CharSequence charSequence = A_1;
				object _<ref> = charSequence.__<ref>;
				LinkedHashSet linkedHashSet = new LinkedHashSet();
				Iterator iterator = this.phonemes.iterator();
				while (iterator.hasNext())
				{
					Rule.Phoneme phoneme = (Rule.Phoneme)iterator.next();
					Set set = linkedHashSet;
					Rule.Phoneme phoneme2 = phoneme;
					object obj = _<ref>;
					CharSequence charSequence2;
					charSequence2.__<ref> = obj;
					set.add(phoneme2.append(charSequence2));
				}
				return new PhoneticEngine.PhonemeBuilder(linkedHashSet);
			}

			// Token: 0x06000294 RID: 660 RVA: 0x0000F211 File Offset: 0x0000D411
			[Modifiers(Modifiers.Synthetic)]
			[LineNumberTable(57)]
			[MethodImpl(8)]
			internal PhonemeBuilder(Set A_1, PhoneticEngine$1 A_2)
				: this(A_1)
			{
			}

			// Token: 0x06000295 RID: 661 RVA: 0x0000F21C File Offset: 0x0000D41C
			[LineNumberTable(new byte[] { 90, 134, 127, 1, 105, 140, 191, 10 })]
			[MethodImpl(8)]
			public string makeString()
			{
				StringBuilder stringBuilder = new StringBuilder();
				Iterator iterator = this.phonemes.iterator();
				while (iterator.hasNext())
				{
					Rule.Phoneme phoneme = (Rule.Phoneme)iterator.next();
					if (stringBuilder.length() > 0)
					{
						stringBuilder.append("|");
					}
					StringBuilder stringBuilder2 = stringBuilder;
					object _<ref> = phoneme.getPhonemeText().__<ref>;
					CharSequence charSequence;
					charSequence.__<ref> = _<ref>;
					stringBuilder2.append(charSequence);
				}
				return stringBuilder.toString();
			}

			// Token: 0x06000296 RID: 662 RVA: 0x0000F298 File Offset: 0x0000D498
			[Signature("(Ljava/util/Set<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;)V")]
			[LineNumberTable(new byte[] { 23, 104, 103 })]
			[MethodImpl(8)]
			private PhonemeBuilder(Set A_1)
			{
				this.phonemes = A_1;
			}

			// Token: 0x06000297 RID: 663 RVA: 0x0000F2B4 File Offset: 0x0000D4B4
			[LineNumberTable(new byte[]
			{
				55, 134, 127, 4, 127, 2, 106, 110, 105, 233,
				69, 167
			})]
			[MethodImpl(8)]
			public PhoneticEngine.PhonemeBuilder apply(Rule.PhonemeExpr A_1, int A_2)
			{
				LinkedHashSet linkedHashSet = new LinkedHashSet();
				Iterator iterator = this.phonemes.iterator();
				while (iterator.hasNext())
				{
					Rule.Phoneme phoneme = (Rule.Phoneme)iterator.next();
					Iterator iterator2 = A_1.getPhonemes().iterator();
					while (iterator2.hasNext())
					{
						Rule.Phoneme phoneme2 = (Rule.Phoneme)iterator2.next();
						Rule.Phoneme phoneme3 = phoneme.join(phoneme2);
						if (!phoneme3.getLanguages().isEmpty())
						{
							if (((Set)linkedHashSet).size() >= A_2)
							{
								goto IL_007B;
							}
							((Set)linkedHashSet).add(phoneme3);
						}
					}
				}
				IL_007B:
				return new PhoneticEngine.PhonemeBuilder(linkedHashSet);
			}

			// Token: 0x040000FC RID: 252
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			[Signature("Ljava/util/Set<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
			private Set phonemes;
		}

		// Token: 0x02000046 RID: 70
		[InnerClass(null, Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		[SourceFile("PhoneticEngine.java")]
		internal sealed class RulesApplication : Object
		{
			// Token: 0x06000298 RID: 664 RVA: 0x0000F344 File Offset: 0x0000D544
			[Signature("(Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;Ljava/lang/CharSequence;Lcom/edc/classbook/util/codec/language/bm/PhoneticEngine$PhonemeBuilder;II)V")]
			[LineNumberTable(new byte[]
			{
				159, 99, 170, 104, 99, 144, 103, 103, 119, 104,
				104
			})]
			[MethodImpl(8)]
			public RulesApplication(List A_1, CharSequence A_2, PhoneticEngine.PhonemeBuilder A_3, int A_4, int A_5)
			{
				CharSequence charSequence = A_2;
				object _<ref> = charSequence.__<ref>;
				base..ctor();
				if (A_1 == null)
				{
					string text = "The finalRules argument must not be null";
					Throwable.__<suppressFillInStackTrace>();
					throw new NullPointerException(text);
				}
				this.finalRules = A_1;
				this.phonemeBuilder = A_3;
				object obj = _<ref>;
				CharSequence charSequence2;
				charSequence2.__<ref> = obj;
				this.input = charSequence2;
				this.i = A_4;
				this.maxPhonemes = A_5;
			}

			// Token: 0x06000299 RID: 665 RVA: 0x0000F3AC File Offset: 0x0000D5AC
			[LineNumberTable(new byte[]
			{
				160, 88, 103, 98, 127, 4, 103, 135, 127, 20,
				165, 125, 103, 162, 104, 162, 110
			})]
			[MethodImpl(8)]
			public PhoneticEngine.RulesApplication invoke()
			{
				this.found = false;
				int num = 0;
				Iterator iterator = this.finalRules.iterator();
				while (iterator.hasNext())
				{
					Rule rule = (Rule)iterator.next();
					string pattern = rule.getPattern();
					num = String.instancehelper_length(pattern);
					Rule rule2 = rule;
					CharSequence charSequence = this.input;
					object _<ref> = charSequence.__<ref>;
					int num2 = this.i;
					object obj = _<ref>;
					CharSequence charSequence2;
					charSequence2.__<ref> = obj;
					if (rule2.patternAndContextMatches(charSequence2, num2))
					{
						this.phonemeBuilder = this.phonemeBuilder.apply(rule.getPhoneme(), this.maxPhonemes);
						this.found = true;
						break;
					}
				}
				if (!this.found)
				{
					num = 1;
				}
				this.i += num;
				return this;
			}

			// Token: 0x0600029A RID: 666 RVA: 0x0000F46A File Offset: 0x0000D66A
			public bool isFound()
			{
				return this.found;
			}

			// Token: 0x0600029B RID: 667 RVA: 0x0000F472 File Offset: 0x0000D672
			public PhoneticEngine.PhonemeBuilder getPhonemeBuilder()
			{
				return this.phonemeBuilder;
			}

			// Token: 0x0600029C RID: 668 RVA: 0x0000F47A File Offset: 0x0000D67A
			public int getI()
			{
				return this.i;
			}

			// Token: 0x040000FD RID: 253
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			[Signature("Ljava/util/List<Lcom/edc/classbook/util/codec/language/bm/Rule;>;")]
			private List finalRules;

			// Token: 0x040000FE RID: 254
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private CharSequence input;

			// Token: 0x040000FF RID: 255
			private PhoneticEngine.PhonemeBuilder phonemeBuilder;

			// Token: 0x04000100 RID: 256
			private int i;

			// Token: 0x04000101 RID: 257
			private int maxPhonemes;

			// Token: 0x04000102 RID: 258
			private bool found;
		}
	}
}
