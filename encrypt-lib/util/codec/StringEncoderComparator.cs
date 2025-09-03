using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec
{
	// Token: 0x02000013 RID: 19
	[Implements(new string[] { "java.util.Comparator" })]
	public class StringEncoderComparator : Object, Comparator
	{
		// Token: 0x060000AC RID: 172 RVA: 0x00002D10 File Offset: 0x00000F10
		[Obsolete]
		[LineNumberTable(new byte[] { 159, 187, 104, 103 })]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public StringEncoderComparator()
		{
			this.stringEncoder = null;
		}

		// Token: 0x060000AD RID: 173 RVA: 0x00002D2C File Offset: 0x00000F2C
		[LineNumberTable(new byte[] { 5, 104, 103 })]
		[MethodImpl(8)]
		public StringEncoderComparator(StringEncoder stringEncoder)
		{
			this.stringEncoder = stringEncoder;
		}

		// Token: 0x060000AE RID: 174 RVA: 0x00002D48 File Offset: 0x00000F48
		[LineNumberTable(new byte[] { 25, 162, 114, 114, 179, 2, 97, 130 })]
		[MethodImpl(8)]
		public virtual int compare(object o1, object o2)
		{
			int num;
			try
			{
				IComparable comparable = (IComparable)this.stringEncoder.encode(o1);
				IComparable comparable2 = (IComparable)this.stringEncoder.encode(o2);
				num = Comparable.__Helper.compareTo(comparable, comparable2);
			}
			catch (EncoderException ex)
			{
				goto IL_0036;
			}
			return num;
			IL_0036:
			num = 0;
			return num;
		}

		// Token: 0x060000AF RID: 175 RVA: 0x00002DA4 File Offset: 0x00000FA4
		[HideFromJava]
		bool Comparator.Object;)Zequals(object A_1)
		{
			return Object.instancehelper_equals(this, A_1);
		}

		// Token: 0x04000043 RID: 67
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private StringEncoder stringEncoder;
	}
}
