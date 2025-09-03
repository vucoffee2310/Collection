using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x0200002A RID: 42
	public class Caverphone1 : AbstractCaverphone
	{
		// Token: 0x060001A9 RID: 425 RVA: 0x0000A24E File Offset: 0x0000844E
		[LineNumberTable(35)]
		[MethodImpl(8)]
		public Caverphone1()
		{
		}

		// Token: 0x060001AA RID: 426 RVA: 0x0000A258 File Offset: 0x00008458
		[LineNumberTable(new byte[]
		{
			159, 190, 98, 107, 198, 172, 209, 113, 113, 113,
			113, 177, 177, 113, 113, 113, 113, 113, 113, 113,
			113, 113, 113, 113, 113, 113, 113, 113, 113, 113,
			145, 113, 113, 113, 113, 113, 113, 113, 113, 113,
			113, 113, 113, 113, 113, 113, 113, 113, 113, 113,
			113, 113, 113, 113, 113, 113, 113, 177, 113, 177,
			187
		})]
		[MethodImpl(8)]
		public override string encode(string source)
		{
			if (source == null || String.instancehelper_length(source) == 0)
			{
				return "111111";
			}
			string text = String.instancehelper_toLowerCase(source, Locale.ENGLISH);
			text = String.instancehelper_replaceAll(text, "[^a-z]", "");
			text = String.instancehelper_replaceAll(text, "^cough", "cou2f");
			text = String.instancehelper_replaceAll(text, "^rough", "rou2f");
			text = String.instancehelper_replaceAll(text, "^tough", "tou2f");
			text = String.instancehelper_replaceAll(text, "^enough", "enou2f");
			text = String.instancehelper_replaceAll(text, "^gn", "2n");
			text = String.instancehelper_replaceAll(text, "mb$", "m2");
			text = String.instancehelper_replaceAll(text, "cq", "2q");
			text = String.instancehelper_replaceAll(text, "ci", "si");
			text = String.instancehelper_replaceAll(text, "ce", "se");
			text = String.instancehelper_replaceAll(text, "cy", "sy");
			text = String.instancehelper_replaceAll(text, "tch", "2ch");
			text = String.instancehelper_replaceAll(text, "c", "k");
			text = String.instancehelper_replaceAll(text, "q", "k");
			text = String.instancehelper_replaceAll(text, "x", "k");
			text = String.instancehelper_replaceAll(text, "v", "f");
			text = String.instancehelper_replaceAll(text, "dg", "2g");
			text = String.instancehelper_replaceAll(text, "tio", "sio");
			text = String.instancehelper_replaceAll(text, "tia", "sia");
			text = String.instancehelper_replaceAll(text, "d", "t");
			text = String.instancehelper_replaceAll(text, "ph", "fh");
			text = String.instancehelper_replaceAll(text, "b", "p");
			text = String.instancehelper_replaceAll(text, "sh", "s2");
			text = String.instancehelper_replaceAll(text, "z", "s");
			text = String.instancehelper_replaceAll(text, "^[aeiou]", "A");
			text = String.instancehelper_replaceAll(text, "[aeiou]", "3");
			text = String.instancehelper_replaceAll(text, "3gh3", "3kh3");
			text = String.instancehelper_replaceAll(text, "gh", "22");
			text = String.instancehelper_replaceAll(text, "g", "k");
			text = String.instancehelper_replaceAll(text, "s+", "S");
			text = String.instancehelper_replaceAll(text, "t+", "T");
			text = String.instancehelper_replaceAll(text, "p+", "P");
			text = String.instancehelper_replaceAll(text, "k+", "K");
			text = String.instancehelper_replaceAll(text, "f+", "F");
			text = String.instancehelper_replaceAll(text, "m+", "M");
			text = String.instancehelper_replaceAll(text, "n+", "N");
			text = String.instancehelper_replaceAll(text, "w3", "W3");
			text = String.instancehelper_replaceAll(text, "wy", "Wy");
			text = String.instancehelper_replaceAll(text, "wh3", "Wh3");
			text = String.instancehelper_replaceAll(text, "why", "Why");
			text = String.instancehelper_replaceAll(text, "w", "2");
			text = String.instancehelper_replaceAll(text, "^h", "A");
			text = String.instancehelper_replaceAll(text, "h", "2");
			text = String.instancehelper_replaceAll(text, "r3", "R3");
			text = String.instancehelper_replaceAll(text, "ry", "Ry");
			text = String.instancehelper_replaceAll(text, "r", "2");
			text = String.instancehelper_replaceAll(text, "l3", "L3");
			text = String.instancehelper_replaceAll(text, "ly", "Ly");
			text = String.instancehelper_replaceAll(text, "l", "2");
			text = String.instancehelper_replaceAll(text, "j", "y");
			text = String.instancehelper_replaceAll(text, "y3", "Y3");
			text = String.instancehelper_replaceAll(text, "y", "2");
			text = String.instancehelper_replaceAll(text, "2", "");
			text = String.instancehelper_replaceAll(text, "3", "");
			text = new StringBuilder().append(text).append("111111").toString();
			return String.instancehelper_substring(text, 0, String.instancehelper_length("111111"));
		}

		// Token: 0x040000A7 RID: 167
		private const string SIX_1 = "111111";
	}
}
