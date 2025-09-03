using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000058 RID: 88
	[Signature("Ljava/lang/Enum<Lcom/edc/classbook/util/codec/language/bm/RuleType;>;")]
	[Modifiers(Modifiers.Public | Modifiers.Final | Modifiers.Super | Modifiers.Enum)]
	[Serializable]
	public sealed class RuleType : Enum
	{
		// Token: 0x060002E2 RID: 738 RVA: 0x0001090E File Offset: 0x0000EB0E
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060002E3 RID: 739 RVA: 0x00010910 File Offset: 0x0000EB10
		public string getName()
		{
			return this.name;
		}

		// Token: 0x060002E4 RID: 740 RVA: 0x00010918 File Offset: 0x0000EB18
		[LineNumberTable(26)]
		[MethodImpl(8)]
		public static RuleType[] values()
		{
			return (RuleType[])RuleType.$VALUES.Clone();
		}

		// Token: 0x060002E5 RID: 741 RVA: 0x0001092C File Offset: 0x0000EB2C
		[Signature("(Ljava/lang/String;)V")]
		[LineNumberTable(new byte[] { 159, 179, 106, 103 })]
		[MethodImpl(8)]
		private RuleType(string A_1, int A_2, string A_3)
			: base(A_1, A_2)
		{
			this.name = A_3;
			GC.KeepAlive(this);
		}

		// Token: 0x060002E6 RID: 742 RVA: 0x00010950 File Offset: 0x0000EB50
		[LineNumberTable(26)]
		[MethodImpl(8)]
		public static RuleType valueOf(string name)
		{
			return (RuleType)Enum.valueOf(ClassLiteral<RuleType>.Value, name);
		}

		// Token: 0x17000013 RID: 19
		// (get) Token: 0x060002E8 RID: 744 RVA: 0x000109D3 File Offset: 0x0000EBD3
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static RuleType APPROX
		{
			[HideFromJava]
			get
			{
				return RuleType.__<>APPROX;
			}
		}

		// Token: 0x17000014 RID: 20
		// (get) Token: 0x060002E9 RID: 745 RVA: 0x000109DA File Offset: 0x0000EBDA
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static RuleType EXACT
		{
			[HideFromJava]
			get
			{
				return RuleType.__<>EXACT;
			}
		}

		// Token: 0x17000015 RID: 21
		// (get) Token: 0x060002EA RID: 746 RVA: 0x000109E1 File Offset: 0x0000EBE1
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static RuleType RULES
		{
			[HideFromJava]
			get
			{
				return RuleType.__<>RULES;
			}
		}

		// Token: 0x04000124 RID: 292
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static RuleType __<>APPROX = new RuleType("APPROX", 0, "approx");

		// Token: 0x04000125 RID: 293
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static RuleType __<>EXACT = new RuleType("EXACT", 1, "exact");

		// Token: 0x04000126 RID: 294
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static RuleType __<>RULES = new RuleType("RULES", 2, "rules");

		// Token: 0x04000127 RID: 295
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private new string name;

		// Token: 0x04000128 RID: 296
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final | Modifiers.Synthetic)]
		private static RuleType[] $VALUES = new RuleType[]
		{
			RuleType.__<>APPROX,
			RuleType.__<>EXACT,
			RuleType.__<>RULES
		};

		// Token: 0x02000059 RID: 89
		[HideFromJava]
		[Serializable]
		public enum __Enum
		{
			// Token: 0x0400012A RID: 298
			APPROX,
			// Token: 0x0400012B RID: 299
			EXACT,
			// Token: 0x0400012C RID: 300
			RULES
		}
	}
}
