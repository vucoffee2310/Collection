using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000052 RID: 82
	[InnerClass(null, Modifiers.Static)]
	[Implements(new string[] { "java.util.Comparator" })]
	[Signature("Ljava/lang/Object;Ljava/util/Comparator<Lcom/edc/classbook/util/codec/language/bm/Rule$Phoneme;>;")]
	[EnclosingMethod("com.edc.classbook.util.codec.language.bm.Rule$Phoneme", null, null)]
	[SourceFile("Rule.java")]
	internal sealed class Rule$Phoneme$1 : Object, Comparator
	{
		// Token: 0x060002B4 RID: 692 RVA: 0x00010620 File Offset: 0x0000E820
		[LineNumberTable(new byte[]
		{
			36, 127, 7, 127, 3, 130, 127, 44, 100, 227,
			58, 233, 74, 127, 33, 162
		})]
		[MethodImpl(8)]
		public int compare(Rule.Phoneme A_1, Rule.Phoneme A_2)
		{
			int num = 0;
			object obj;
			CharSequence charSequence;
			for (;;)
			{
				int num2 = num;
				obj = Rule.Phoneme.access$000(A_1).__<ref>;
				charSequence.__<ref> = obj;
				if (num2 >= charSequence.length())
				{
					goto IL_00A5;
				}
				int num3 = num;
				obj = Rule.Phoneme.access$000(A_2).__<ref>;
				charSequence.__<ref> = obj;
				if (num3 >= charSequence.length())
				{
					break;
				}
				object _<ref> = Rule.Phoneme.access$000(A_1).__<ref>;
				int num4 = num;
				obj = _<ref>;
				charSequence.__<ref> = obj;
				int num5 = (int)charSequence.charAt(num4);
				object _<ref>2 = Rule.Phoneme.access$000(A_2).__<ref>;
				num4 = num;
				obj = _<ref>2;
				charSequence.__<ref> = obj;
				int num6 = num5 - (int)charSequence.charAt(num4);
				if (num6 != 0)
				{
					return num6;
				}
				num++;
			}
			return 1;
			IL_00A5:
			obj = Rule.Phoneme.access$000(A_1).__<ref>;
			charSequence.__<ref> = obj;
			int num7 = charSequence.length();
			obj = Rule.Phoneme.access$000(A_2).__<ref>;
			charSequence.__<ref> = obj;
			if (num7 < charSequence.length())
			{
				return -1;
			}
			return 0;
		}

		// Token: 0x060002B5 RID: 693 RVA: 0x00010715 File Offset: 0x0000E915
		[LineNumberTable(83)]
		[MethodImpl(8)]
		internal Rule$Phoneme$1()
		{
		}

		// Token: 0x060002B6 RID: 694 RVA: 0x0001071F File Offset: 0x0000E91F
		[Modifiers(Modifiers.Public | Modifiers.Volatile | Modifiers.Synthetic)]
		[LineNumberTable(83)]
		[MethodImpl(8)]
		public int compare(object A_1, object A_2)
		{
			return this.compare((Rule.Phoneme)A_1, (Rule.Phoneme)A_2);
		}

		// Token: 0x060002B7 RID: 695 RVA: 0x00010735 File Offset: 0x0000E935
		[HideFromJava]
		bool Comparator.Object;)Zequals(object A_1)
		{
			return Object.instancehelper_equals(this, A_1);
		}
	}
}
