using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using ikvm.@internal;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000040 RID: 64
	[Signature("Ljava/lang/Enum<Lcom/edc/classbook/util/codec/language/bm/NameType;>;")]
	[Modifiers(Modifiers.Public | Modifiers.Final | Modifiers.Super | Modifiers.Enum)]
	[Serializable]
	public sealed class NameType : Enum
	{
		// Token: 0x06000272 RID: 626 RVA: 0x0000E575 File Offset: 0x0000C775
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x06000273 RID: 627 RVA: 0x0000E577 File Offset: 0x0000C777
		[LineNumberTable(28)]
		[MethodImpl(8)]
		public static NameType[] values()
		{
			return (NameType[])NameType.$VALUES.Clone();
		}

		// Token: 0x06000274 RID: 628 RVA: 0x0000E588 File Offset: 0x0000C788
		public string getName()
		{
			return this.name;
		}

		// Token: 0x06000275 RID: 629 RVA: 0x0000E590 File Offset: 0x0000C790
		[Signature("(Ljava/lang/String;)V")]
		[LineNumberTable(new byte[] { 159, 183, 106, 103 })]
		[MethodImpl(8)]
		private NameType(string A_1, int A_2, string A_3)
			: base(A_1, A_2)
		{
			this.name = A_3;
			GC.KeepAlive(this);
		}

		// Token: 0x06000276 RID: 630 RVA: 0x0000E5B4 File Offset: 0x0000C7B4
		[LineNumberTable(28)]
		[MethodImpl(8)]
		public static NameType valueOf(string name)
		{
			return (NameType)Enum.valueOf(ClassLiteral<NameType>.Value, name);
		}

		// Token: 0x1700000E RID: 14
		// (get) Token: 0x06000278 RID: 632 RVA: 0x0000E637 File Offset: 0x0000C837
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static NameType ASHKENAZI
		{
			[HideFromJava]
			get
			{
				return NameType.__<>ASHKENAZI;
			}
		}

		// Token: 0x1700000F RID: 15
		// (get) Token: 0x06000279 RID: 633 RVA: 0x0000E63E File Offset: 0x0000C83E
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static NameType GENERIC
		{
			[HideFromJava]
			get
			{
				return NameType.__<>GENERIC;
			}
		}

		// Token: 0x17000010 RID: 16
		// (get) Token: 0x0600027A RID: 634 RVA: 0x0000E645 File Offset: 0x0000C845
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		public static NameType SEPHARDIC
		{
			[HideFromJava]
			get
			{
				return NameType.__<>SEPHARDIC;
			}
		}

		// Token: 0x040000E9 RID: 233
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static NameType __<>ASHKENAZI = new NameType("ASHKENAZI", 0, "ash");

		// Token: 0x040000EA RID: 234
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static NameType __<>GENERIC = new NameType("GENERIC", 1, "gen");

		// Token: 0x040000EB RID: 235
		[Modifiers(Modifiers.Public | Modifiers.Static | Modifiers.Final | Modifiers.Enum)]
		internal static NameType __<>SEPHARDIC = new NameType("SEPHARDIC", 2, "sep");

		// Token: 0x040000EC RID: 236
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private new string name;

		// Token: 0x040000ED RID: 237
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final | Modifiers.Synthetic)]
		private static NameType[] $VALUES = new NameType[]
		{
			NameType.__<>ASHKENAZI,
			NameType.__<>GENERIC,
			NameType.__<>SEPHARDIC
		};

		// Token: 0x02000041 RID: 65
		[HideFromJava]
		[Serializable]
		public enum __Enum
		{
			// Token: 0x040000EF RID: 239
			ASHKENAZI,
			// Token: 0x040000F0 RID: 240
			GENERIC,
			// Token: 0x040000F1 RID: 241
			SEPHARDIC
		}
	}
}
