using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.util;

namespace com.edc.classbook.util.codec.language
{
	// Token: 0x02000030 RID: 48
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class DoubleMetaphone : Object, StringEncoder, Encoder
	{
		// Token: 0x060001C4 RID: 452 RVA: 0x0000B2D3 File Offset: 0x000094D3
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x060001C5 RID: 453 RVA: 0x0000B2D5 File Offset: 0x000094D5
		public virtual int getMaxCodeLen()
		{
			return this.maxCodeLen;
		}

		// Token: 0x060001C6 RID: 454 RVA: 0x0000B2E0 File Offset: 0x000094E0
		[LineNumberTable(new byte[]
		{
			159, 121, 130, 105, 99, 162, 104, 142, 141, 121,
			255, 160, 223, 71, 105, 133, 104, 119, 165, 104,
			100, 133, 106, 133, 106, 133, 104, 119, 133, 107,
			133, 106, 133, 107, 133, 104, 119, 133, 106, 133,
			104, 115, 133, 104, 119, 165, 104, 100, 133, 106,
			133, 104, 119, 133, 107, 133, 107, 133, 106, 133,
			104, 119, 133, 106, 133, 106, 133, 107, 133, 100,
			197
		})]
		[MethodImpl(8)]
		public virtual string doubleMetaphone(string value, bool alternate)
		{
			value = this.cleanInput(value);
			if (value == null)
			{
				return null;
			}
			int num = (this.isSlavoGermanic(value) ? 1 : 0);
			int num2 = ((!this.isSilentStart(value)) ? 0 : 1);
			DoubleMetaphone.DoubleMetaphoneResult doubleMetaphoneResult = new DoubleMetaphone.DoubleMetaphoneResult(this, this.getMaxCodeLen());
			while (!doubleMetaphoneResult.isComplete() && num2 <= String.instancehelper_length(value) - 1)
			{
				char c = String.instancehelper_charAt(value, num2);
				if (c != 'A')
				{
					if (c == 'B')
					{
						doubleMetaphoneResult.append('P');
						num2 = ((this.charAt(value, num2 + 1) != 'B') ? (num2 + 1) : (num2 + 2));
						continue;
					}
					if (c == 'C')
					{
						num2 = this.handleC(value, doubleMetaphoneResult, num2);
						continue;
					}
					if (c == 'D')
					{
						num2 = this.handleD(value, doubleMetaphoneResult, num2);
						continue;
					}
					if (c != 'E')
					{
						if (c == 'F')
						{
							doubleMetaphoneResult.append('F');
							num2 = ((this.charAt(value, num2 + 1) != 'F') ? (num2 + 1) : (num2 + 2));
							continue;
						}
						if (c == 'G')
						{
							num2 = this.handleG(value, doubleMetaphoneResult, num2, num != 0);
							continue;
						}
						if (c == 'H')
						{
							num2 = this.handleH(value, doubleMetaphoneResult, num2);
							continue;
						}
						if (c != 'I')
						{
							if (c == 'J')
							{
								num2 = this.handleJ(value, doubleMetaphoneResult, num2, num != 0);
								continue;
							}
							if (c == 'K')
							{
								doubleMetaphoneResult.append('K');
								num2 = ((this.charAt(value, num2 + 1) != 'K') ? (num2 + 1) : (num2 + 2));
								continue;
							}
							if (c == 'L')
							{
								num2 = this.handleL(value, doubleMetaphoneResult, num2);
								continue;
							}
							if (c == 'M')
							{
								doubleMetaphoneResult.append('M');
								num2 = ((!this.conditionM0(value, num2)) ? (num2 + 1) : (num2 + 2));
								continue;
							}
							if (c == 'N')
							{
								doubleMetaphoneResult.append('N');
								num2 = ((this.charAt(value, num2 + 1) != 'N') ? (num2 + 1) : (num2 + 2));
								continue;
							}
							if (c != 'O')
							{
								if (c == 'P')
								{
									num2 = this.handleP(value, doubleMetaphoneResult, num2);
									continue;
								}
								if (c == 'Q')
								{
									doubleMetaphoneResult.append('K');
									num2 = ((this.charAt(value, num2 + 1) != 'Q') ? (num2 + 1) : (num2 + 2));
									continue;
								}
								if (c == 'R')
								{
									num2 = this.handleR(value, doubleMetaphoneResult, num2, num != 0);
									continue;
								}
								if (c == 'S')
								{
									num2 = this.handleS(value, doubleMetaphoneResult, num2, num != 0);
									continue;
								}
								if (c == 'T')
								{
									num2 = this.handleT(value, doubleMetaphoneResult, num2);
									continue;
								}
								if (c != 'U')
								{
									if (c == 'V')
									{
										doubleMetaphoneResult.append('F');
										num2 = ((this.charAt(value, num2 + 1) != 'V') ? (num2 + 1) : (num2 + 2));
										continue;
									}
									if (c == 'W')
									{
										num2 = this.handleW(value, doubleMetaphoneResult, num2);
										continue;
									}
									if (c == 'X')
									{
										num2 = this.handleX(value, doubleMetaphoneResult, num2);
										continue;
									}
									if (c != 'Y')
									{
										if (c == 'Z')
										{
											num2 = this.handleZ(value, doubleMetaphoneResult, num2, num != 0);
											continue;
										}
										if (c == 'Ç')
										{
											doubleMetaphoneResult.append('S');
											num2++;
											continue;
										}
										if (c == 'Ñ')
										{
											doubleMetaphoneResult.append('N');
											num2++;
											continue;
										}
										num2++;
										continue;
									}
								}
							}
						}
					}
				}
				num2 = this.handleAEIOUY(doubleMetaphoneResult, num2);
			}
			return (!alternate) ? doubleMetaphoneResult.getPrimary() : doubleMetaphoneResult.getAlternate();
		}

		// Token: 0x060001C7 RID: 455 RVA: 0x0000B683 File Offset: 0x00009883
		[LineNumberTable(new byte[] { 163, 1, 99, 130, 104, 104, 130 })]
		[MethodImpl(8)]
		private string cleanInput(string A_1)
		{
			if (A_1 == null)
			{
				return null;
			}
			A_1 = String.instancehelper_trim(A_1);
			if (String.instancehelper_length(A_1) == 0)
			{
				return null;
			}
			return String.instancehelper_toUpperCase(A_1, Locale.ENGLISH);
		}

		// Token: 0x060001C8 RID: 456 RVA: 0x0000B6A9 File Offset: 0x000098A9
		[LineNumberTable(852)]
		[MethodImpl(8)]
		private bool isSlavoGermanic(string A_1)
		{
			return String.instancehelper_indexOf(A_1, 87) > -1 || String.instancehelper_indexOf(A_1, 75) > -1 || String.instancehelper_indexOf(A_1, "CZ") > -1 || String.instancehelper_indexOf(A_1, "WITZ") > -1;
		}

		// Token: 0x060001C9 RID: 457 RVA: 0x0000B6E4 File Offset: 0x000098E4
		[LineNumberTable(new byte[] { 162, 243, 98, 116, 106, 98, 226, 61, 230, 70 })]
		[MethodImpl(8)]
		private bool isSilentStart(string A_1)
		{
			int num = 0;
			string[] silent_START = DoubleMetaphone.SILENT_START;
			int num2 = silent_START.Length;
			for (int i = 0; i < num2; i++)
			{
				string text = silent_START[i];
				if (String.instancehelper_startsWith(A_1, text))
				{
					num = 1;
					break;
				}
			}
			return num != 0;
		}

		// Token: 0x060001CA RID: 458 RVA: 0x0000B71C File Offset: 0x0000991C
		[LineNumberTable(new byte[] { 160, 155, 99, 136 })]
		[MethodImpl(8)]
		private int handleAEIOUY(DoubleMetaphone.DoubleMetaphoneResult A_1, int A_2)
		{
			if (A_2 == 0)
			{
				A_1.append('A');
			}
			return A_2 + 1;
		}

		// Token: 0x060001CB RID: 459 RVA: 0x0000B72C File Offset: 0x0000992C
		[LineNumberTable(new byte[] { 163, 17, 109, 130 })]
		[MethodImpl(8)]
		protected internal virtual char charAt(string value, int index)
		{
			if (index < 0 || index >= String.instancehelper_length(value))
			{
				return '\0';
			}
			return String.instancehelper_charAt(value, index);
		}

		// Token: 0x060001CC RID: 460 RVA: 0x0000B748 File Offset: 0x00009948
		[LineNumberTable(new byte[]
		{
			160, 165, 106, 104, 106, 114, 104, 106, 111, 112,
			191, 1, 106, 106, 145, 104, 106, 191, 0, 108,
			121, 104, 106, 153, 121, 140, 136, 135, 104, 155,
			103, 159, 18, 135, 197
		})]
		[MethodImpl(8)]
		private int handleC(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (this.conditionC0(A_1, A_3))
			{
				A_2.append('K');
				A_3 += 2;
			}
			else if (A_3 == 0 && DoubleMetaphone.contains(A_1, A_3, 6, "CAESAR"))
			{
				A_2.append('S');
				A_3 += 2;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "CH"))
			{
				A_3 = this.handleCH(A_1, A_2, A_3);
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "CZ") && !DoubleMetaphone.contains(A_1, A_3 - 2, 4, "WICZ"))
			{
				A_2.append('S', 'X');
				A_3 += 2;
			}
			else if (DoubleMetaphone.contains(A_1, A_3 + 1, 3, "CIA"))
			{
				A_2.append('X');
				A_3 += 3;
			}
			else
			{
				if (DoubleMetaphone.contains(A_1, A_3, 2, "CC") && (A_3 != 1 || this.charAt(A_1, 0) != 'M'))
				{
					return this.handleCC(A_1, A_2, A_3);
				}
				if (DoubleMetaphone.contains(A_1, A_3, 2, "CK", "CG", "CQ"))
				{
					A_2.append('K');
					A_3 += 2;
				}
				else if (DoubleMetaphone.contains(A_1, A_3, 2, "CI", "CE", "CY"))
				{
					if (DoubleMetaphone.contains(A_1, A_3, 3, "CIO", "CIE", "CIA"))
					{
						A_2.append('S', 'X');
					}
					else
					{
						A_2.append('S');
					}
					A_3 += 2;
				}
				else
				{
					A_2.append('K');
					if (DoubleMetaphone.contains(A_1, A_3 + 1, 2, " C", " Q", " G"))
					{
						A_3 += 3;
					}
					else if (DoubleMetaphone.contains(A_1, A_3 + 1, 1, "C", "K", "Q") && !DoubleMetaphone.contains(A_1, A_3 + 1, 2, "CE", "CI"))
					{
						A_3 += 2;
					}
					else
					{
						A_3++;
					}
				}
			}
			return A_3;
		}

		// Token: 0x060001CD RID: 461 RVA: 0x0000B918 File Offset: 0x00009B18
		[LineNumberTable(new byte[]
		{
			161, 14, 143, 123, 104, 167, 107, 135, 116, 104,
			135, 104, 133
		})]
		[MethodImpl(8)]
		private int handleD(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (DoubleMetaphone.contains(A_1, A_3, 2, "DG"))
			{
				if (DoubleMetaphone.contains(A_1, A_3 + 2, 1, "I", "E", "Y"))
				{
					A_2.append('J');
					A_3 += 3;
				}
				else
				{
					A_2.append("TK");
					A_3 += 2;
				}
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "DT", "DD"))
			{
				A_2.append('T');
				A_3 += 2;
			}
			else
			{
				A_2.append('T');
				A_3++;
			}
			return A_3;
		}

		// Token: 0x060001CE RID: 462 RVA: 0x0000B9A4 File Offset: 0x00009BA4
		[LineNumberTable(new byte[]
		{
			159, 40, 67, 110, 112, 113, 119, 114, 159, 3,
			146, 139, 106, 116, 112, 106, 223, 3, 106, 106,
			255, 69, 70, 106, 106, 191, 21, 223, 21, 106,
			113, 138, 138, 103, 110, 101, 138, 101, 136
		})]
		[MethodImpl(8)]
		private int handleG(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3, bool A_4)
		{
			if (this.charAt(A_1, A_3 + 1) == 'H')
			{
				A_3 = this.handleGH(A_1, A_2, A_3);
			}
			else if (this.charAt(A_1, A_3 + 1) == 'N')
			{
				if (A_3 == 1 && this.isVowel(this.charAt(A_1, 0)) && !A_4)
				{
					A_2.append("KN", "N");
				}
				else if (!DoubleMetaphone.contains(A_1, A_3 + 2, 2, "EY") && this.charAt(A_1, A_3 + 1) != 'Y' && !A_4)
				{
					A_2.append("N", "KN");
				}
				else
				{
					A_2.append("KN");
				}
				A_3 += 2;
			}
			else if (DoubleMetaphone.contains(A_1, A_3 + 1, 2, "LI") && !A_4)
			{
				A_2.append("KL", "L");
				A_3 += 2;
			}
			else if (A_3 == 0 && (this.charAt(A_1, A_3 + 1) == 'Y' || DoubleMetaphone.contains(A_1, A_3 + 1, 2, DoubleMetaphone.ES_EP_EB_EL_EY_IB_IL_IN_IE_EI_ER)))
			{
				A_2.append('K', 'J');
				A_3 += 2;
			}
			else if ((DoubleMetaphone.contains(A_1, A_3 + 1, 2, "ER") || this.charAt(A_1, A_3 + 1) == 'Y') && !DoubleMetaphone.contains(A_1, 0, 6, "DANGER", "RANGER", "MANGER") && !DoubleMetaphone.contains(A_1, A_3 - 1, 1, "E", "I") && !DoubleMetaphone.contains(A_1, A_3 - 1, 3, "RGY", "OGY"))
			{
				A_2.append('K', 'J');
				A_3 += 2;
			}
			else if (DoubleMetaphone.contains(A_1, A_3 + 1, 1, "E", "I", "Y") || DoubleMetaphone.contains(A_1, A_3 - 1, 4, "AGGI", "OGGI"))
			{
				if (DoubleMetaphone.contains(A_1, 0, 4, "VAN ", "VON ") || DoubleMetaphone.contains(A_1, 0, 3, "SCH") || DoubleMetaphone.contains(A_1, A_3 + 1, 2, "ET"))
				{
					A_2.append('K');
				}
				else if (DoubleMetaphone.contains(A_1, A_3 + 1, 3, "IER"))
				{
					A_2.append('J');
				}
				else
				{
					A_2.append('J', 'K');
				}
				A_3 += 2;
			}
			else if (this.charAt(A_1, A_3 + 1) == 'G')
			{
				A_3 += 2;
				A_2.append('K');
			}
			else
			{
				A_3++;
				A_2.append('K');
			}
			return A_3;
		}

		// Token: 0x060001CF RID: 463 RVA: 0x0000BBFA File Offset: 0x00009DFA
		[LineNumberTable(new byte[] { 161, 128, 159, 8, 104, 167, 133 })]
		[MethodImpl(8)]
		private int handleH(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if ((A_3 == 0 || this.isVowel(this.charAt(A_1, A_3 - 1))) && this.isVowel(this.charAt(A_1, A_3 + 1)))
			{
				A_2.append('H');
				A_3 += 2;
			}
			else
			{
				A_3++;
			}
			return A_3;
		}

		// Token: 0x060001D0 RID: 464 RVA: 0x0000BC38 File Offset: 0x00009E38
		[LineNumberTable(new byte[]
		{
			159, 14, 99, 158, 159, 10, 138, 138, 138, 114,
			111, 159, 18, 108, 107, 108, 159, 13, 168, 110,
			135, 165
		})]
		[MethodImpl(8)]
		private int handleJ(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3, bool A_4)
		{
			if (DoubleMetaphone.contains(A_1, A_3, 4, "JOSE") || DoubleMetaphone.contains(A_1, 0, 4, "SAN "))
			{
				if ((A_3 == 0 && this.charAt(A_1, A_3 + 4) == ' ') || String.instancehelper_length(A_1) == 4 || DoubleMetaphone.contains(A_1, 0, 4, "SAN "))
				{
					A_2.append('H');
				}
				else
				{
					A_2.append('J', 'H');
				}
				A_3++;
			}
			else
			{
				if (A_3 == 0 && !DoubleMetaphone.contains(A_1, A_3, 4, "JOSE"))
				{
					A_2.append('J', 'A');
				}
				else if (this.isVowel(this.charAt(A_1, A_3 - 1)) && !A_4 && (this.charAt(A_1, A_3 + 1) == 'A' || this.charAt(A_1, A_3 + 1) == 'O'))
				{
					A_2.append('J', 'H');
				}
				else if (A_3 == String.instancehelper_length(A_1) - 1)
				{
					A_2.append('J', ' ');
				}
				else if (!DoubleMetaphone.contains(A_1, A_3 + 1, 1, DoubleMetaphone.L_T_K_S_N_M_B_Z) && !DoubleMetaphone.contains(A_1, A_3 - 1, 1, "S", "K", "L"))
				{
					A_2.append('J');
				}
				if (this.charAt(A_1, A_3 + 1) == 'J')
				{
					A_3 += 2;
				}
				else
				{
					A_3++;
				}
			}
			return A_3;
		}

		// Token: 0x060001D1 RID: 465 RVA: 0x0000BD74 File Offset: 0x00009F74
		[LineNumberTable(new byte[] { 161, 178, 110, 106, 138, 136, 135, 101, 136 })]
		[MethodImpl(8)]
		private int handleL(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (this.charAt(A_1, A_3 + 1) == 'L')
			{
				if (this.conditionL0(A_1, A_3))
				{
					A_2.appendPrimary('L');
				}
				else
				{
					A_2.append('L');
				}
				A_3 += 2;
			}
			else
			{
				A_3++;
				A_2.append('L');
			}
			return A_3;
		}

		// Token: 0x060001D2 RID: 466 RVA: 0x0000BDC0 File Offset: 0x00009FC0
		[LineNumberTable(new byte[] { 162, 212, 110, 130 })]
		[MethodImpl(8)]
		private bool conditionM0(string A_1, int A_2)
		{
			return this.charAt(A_1, A_2 + 1) == 'M' || (DoubleMetaphone.contains(A_1, A_2 - 1, 3, "UMB") && (A_2 + 1 == String.instancehelper_length(A_1) - 1 || DoubleMetaphone.contains(A_1, A_2 + 2, 2, "ER")));
		}

		// Token: 0x060001D3 RID: 467 RVA: 0x0000BE10 File Offset: 0x0000A010
		[LineNumberTable(new byte[] { 161, 196, 110, 104, 135, 104, 159, 1 })]
		[MethodImpl(8)]
		private int handleP(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (this.charAt(A_1, A_3 + 1) == 'H')
			{
				A_2.append('F');
				A_3 += 2;
			}
			else
			{
				A_2.append('P');
				A_3 = ((!DoubleMetaphone.contains(A_1, A_3 + 1, 1, "P", "B")) ? (A_3 + 1) : (A_3 + 2));
			}
			return A_3;
		}

		// Token: 0x060001D4 RID: 468 RVA: 0x0000BE64 File Offset: 0x0000A064
		[LineNumberTable(new byte[] { 158, 253, 67, 191, 22, 138, 136 })]
		[MethodImpl(8)]
		private int handleR(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3, bool A_4)
		{
			if (A_3 == String.instancehelper_length(A_1) - 1 && !A_4 && DoubleMetaphone.contains(A_1, A_3 - 2, 2, "IE") && !DoubleMetaphone.contains(A_1, A_3 - 4, 2, "ME", "MA"))
			{
				A_2.appendAlternate('R');
			}
			else
			{
				A_2.append('R');
			}
			return (this.charAt(A_1, A_3 + 1) != 'R') ? (A_3 + 1) : (A_3 + 2);
		}

		// Token: 0x060001D5 RID: 469 RVA: 0x0000BED4 File Offset: 0x0000A0D4
		[LineNumberTable(new byte[]
		{
			158, 250, 131, 150, 106, 146, 106, 106, 111, 159,
			1, 138, 136, 106, 159, 4, 99, 138, 138, 106,
			255, 21, 70, 106, 127, 1, 111, 141, 159, 2,
			138, 136, 159, 1
		})]
		[MethodImpl(8)]
		private int handleS(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3, bool A_4)
		{
			if (DoubleMetaphone.contains(A_1, A_3 - 1, 3, "ISL", "YSL"))
			{
				A_3++;
			}
			else if (A_3 == 0 && DoubleMetaphone.contains(A_1, A_3, 5, "SUGAR"))
			{
				A_2.append('X', 'S');
				A_3++;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "SH"))
			{
				if (DoubleMetaphone.contains(A_1, A_3 + 1, 4, "HEIM", "HOEK", "HOLM", "HOLZ"))
				{
					A_2.append('S');
				}
				else
				{
					A_2.append('X');
				}
				A_3 += 2;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 3, "SIO", "SIA") || DoubleMetaphone.contains(A_1, A_3, 4, "SIAN"))
			{
				if (A_4)
				{
					A_2.append('S');
				}
				else
				{
					A_2.append('S', 'X');
				}
				A_3 += 3;
			}
			else if ((A_3 == 0 && DoubleMetaphone.contains(A_1, A_3 + 1, 1, "M", "N", "L", "W")) || DoubleMetaphone.contains(A_1, A_3 + 1, 1, "Z"))
			{
				A_2.append('S', 'X');
				A_3 = ((!DoubleMetaphone.contains(A_1, A_3 + 1, 1, "Z")) ? (A_3 + 1) : (A_3 + 2));
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "SC"))
			{
				A_3 = this.handleSC(A_1, A_2, A_3);
			}
			else
			{
				if (A_3 == String.instancehelper_length(A_1) - 1 && DoubleMetaphone.contains(A_1, A_3 - 2, 2, "AI", "OI"))
				{
					A_2.appendAlternate('S');
				}
				else
				{
					A_2.append('S');
				}
				A_3 = ((!DoubleMetaphone.contains(A_1, A_3 + 1, 1, "S", "Z")) ? (A_3 + 1) : (A_3 + 2));
			}
			return A_3;
		}

		// Token: 0x060001D6 RID: 470 RVA: 0x0000C088 File Offset: 0x0000A288
		[LineNumberTable(new byte[]
		{
			162, 46, 111, 104, 106, 116, 104, 106, 126, 223,
			26, 138, 138, 135, 104, 159, 1
		})]
		[MethodImpl(8)]
		private int handleT(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (DoubleMetaphone.contains(A_1, A_3, 4, "TION"))
			{
				A_2.append('X');
				A_3 += 3;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 3, "TIA", "TCH"))
			{
				A_2.append('X');
				A_3 += 3;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 2, "TH") || DoubleMetaphone.contains(A_1, A_3, 3, "TTH"))
			{
				if (DoubleMetaphone.contains(A_1, A_3 + 2, 2, "OM", "AM") || DoubleMetaphone.contains(A_1, 0, 4, "VAN ", "VON ") || DoubleMetaphone.contains(A_1, 0, 3, "SCH"))
				{
					A_2.append('T');
				}
				else
				{
					A_2.append('0', 'T');
				}
				A_3 += 2;
			}
			else
			{
				A_2.append('T');
				A_3 = ((!DoubleMetaphone.contains(A_1, A_3 + 1, 1, "T", "D")) ? (A_3 + 1) : (A_3 + 2));
			}
			return A_3;
		}

		// Token: 0x060001D7 RID: 471 RVA: 0x0000C178 File Offset: 0x0000A378
		[LineNumberTable(new byte[]
		{
			162, 73, 143, 104, 138, 159, 5, 146, 172, 136,
			106, 223, 45, 104, 103, 148, 112, 135, 165
		})]
		[MethodImpl(8)]
		private int handleW(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (DoubleMetaphone.contains(A_1, A_3, 2, "WR"))
			{
				A_2.append('R');
				A_3 += 2;
			}
			else if (A_3 == 0 && (this.isVowel(this.charAt(A_1, A_3 + 1)) || DoubleMetaphone.contains(A_1, A_3, 2, "WH")))
			{
				if (this.isVowel(this.charAt(A_1, A_3 + 1)))
				{
					A_2.append('A', 'F');
				}
				else
				{
					A_2.append('A');
				}
				A_3++;
			}
			else if ((A_3 == String.instancehelper_length(A_1) - 1 && this.isVowel(this.charAt(A_1, A_3 - 1))) || DoubleMetaphone.contains(A_1, A_3 - 1, 5, "EWSKI", "EWSKY", "OWSKI", "OWSKY") || DoubleMetaphone.contains(A_1, 0, 3, "SCH"))
			{
				A_2.appendAlternate('F');
				A_3++;
			}
			else if (DoubleMetaphone.contains(A_1, A_3, 4, "WICZ", "WITZ"))
			{
				A_2.append("TS", "FX");
				A_3 += 4;
			}
			else
			{
				A_3++;
			}
			return A_3;
		}

		// Token: 0x060001D8 RID: 472 RVA: 0x0000C288 File Offset: 0x0000A488
		[LineNumberTable(new byte[] { 162, 109, 99, 104, 135, 223, 24, 139, 159, 1 })]
		[MethodImpl(8)]
		private int handleX(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (A_3 == 0)
			{
				A_2.append('S');
				A_3++;
			}
			else
			{
				if (A_3 != String.instancehelper_length(A_1) - 1 || (!DoubleMetaphone.contains(A_1, A_3 - 3, 3, "IAU", "EAU") && !DoubleMetaphone.contains(A_1, A_3 - 2, 2, "AU", "OU")))
				{
					A_2.append("KS");
				}
				A_3 = ((!DoubleMetaphone.contains(A_1, A_3 + 1, 1, "C", "X")) ? (A_3 + 1) : (A_3 + 2));
			}
			return A_3;
		}

		// Token: 0x060001D9 RID: 473 RVA: 0x0000C30C File Offset: 0x0000A50C
		[LineNumberTable(new byte[]
		{
			158, 210, 131, 142, 104, 135, 159, 17, 146, 136,
			152
		})]
		[MethodImpl(8)]
		private int handleZ(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3, bool A_4)
		{
			if (this.charAt(A_1, A_3 + 1) == 'H')
			{
				A_2.append('J');
				A_3 += 2;
			}
			else
			{
				if (DoubleMetaphone.contains(A_1, A_3 + 1, 2, "ZO", "ZI", "ZA") || (A_4 && A_3 > 0 && this.charAt(A_1, A_3 - 1) != 'T'))
				{
					A_2.append("S", "TS");
				}
				else
				{
					A_2.append('S');
				}
				A_3 = ((this.charAt(A_1, A_3 + 1) != 'Z') ? (A_3 + 1) : (A_3 + 2));
			}
			return A_3;
		}

		// Token: 0x060001DA RID: 474 RVA: 0x0000C39C File Offset: 0x0000A59C
		[LineNumberTable(75)]
		[MethodImpl(8)]
		public virtual string doubleMetaphone(string value)
		{
			return this.doubleMetaphone(value, false);
		}

		// Token: 0x060001DB RID: 475 RVA: 0x0000C3A8 File Offset: 0x0000A5A8
		[LineNumberTable(244)]
		[MethodImpl(8)]
		public virtual bool isDoubleMetaphoneEqual(string value1, string value2, bool alternate)
		{
			return String.instancehelper_equals(this.doubleMetaphone(value1, alternate), this.doubleMetaphone(value2, alternate));
		}

		// Token: 0x060001DC RID: 476 RVA: 0x0000C3D0 File Offset: 0x0000A5D0
		[LineNumberTable(new byte[]
		{
			162, 150, 111, 98, 100, 98, 114, 98, 113, 130,
			107
		})]
		[MethodImpl(8)]
		private bool conditionC0(string A_1, int A_2)
		{
			if (DoubleMetaphone.contains(A_1, A_2, 4, "CHIA"))
			{
				return true;
			}
			if (A_2 <= 1)
			{
				return false;
			}
			if (this.isVowel(this.charAt(A_1, A_2 - 2)))
			{
				return false;
			}
			if (!DoubleMetaphone.contains(A_1, A_2 - 1, 3, "ACH"))
			{
				return false;
			}
			int num = (int)this.charAt(A_1, A_2 + 2);
			return (num != 73 && num != 69) || DoubleMetaphone.contains(A_1, A_2 - 2, 6, "BACHER", "MACHER");
		}

		// Token: 0x060001DD RID: 477 RVA: 0x0000C44A File Offset: 0x0000A64A
		[LineNumberTable(909)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3 });
		}

		// Token: 0x060001DE RID: 478 RVA: 0x0000C460 File Offset: 0x0000A660
		[LineNumberTable(new byte[]
		{
			160, 241, 115, 106, 100, 138, 104, 100, 138, 104,
			132, 100, 111, 138, 172, 136
		})]
		[MethodImpl(8)]
		private int handleCH(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (A_3 > 0 && DoubleMetaphone.contains(A_1, A_3, 4, "CHAE"))
			{
				A_2.append('K', 'X');
				return A_3 + 2;
			}
			if (this.conditionCH0(A_1, A_3))
			{
				A_2.append('K');
				return A_3 + 2;
			}
			if (this.conditionCH1(A_1, A_3))
			{
				A_2.append('K');
				return A_3 + 2;
			}
			if (A_3 > 0)
			{
				if (DoubleMetaphone.contains(A_1, 0, 2, "MC"))
				{
					A_2.append('K');
				}
				else
				{
					A_2.append('X', 'K');
				}
			}
			else
			{
				A_2.append('X');
			}
			return A_3 + 2;
		}

		// Token: 0x060001DF RID: 479 RVA: 0x0000C4F0 File Offset: 0x0000A6F0
		[LineNumberTable(new byte[]
		{
			160, 217, 191, 13, 191, 9, 173, 136, 135, 104,
			165
		})]
		[MethodImpl(8)]
		private int handleCC(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (DoubleMetaphone.contains(A_1, A_3 + 2, 1, "I", "E", "H") && !DoubleMetaphone.contains(A_1, A_3 + 2, 2, "HU"))
			{
				if ((A_3 == 1 && this.charAt(A_1, A_3 - 1) == 'A') || DoubleMetaphone.contains(A_1, A_3 - 1, 5, "UCCEE", "UCCES"))
				{
					A_2.append("KS");
				}
				else
				{
					A_2.append('X');
				}
				A_3 += 3;
			}
			else
			{
				A_2.append('K');
				A_3 += 2;
			}
			return A_3;
		}

		// Token: 0x060001E0 RID: 480 RVA: 0x0000C57B File Offset: 0x0000A77B
		[LineNumberTable(925)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3, string A_4, string A_5)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3, A_4, A_5 });
		}

		// Token: 0x060001E1 RID: 481 RVA: 0x0000C59B File Offset: 0x0000A79B
		[LineNumberTable(917)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3, string A_4)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3, A_4 });
		}

		// Token: 0x060001E2 RID: 482 RVA: 0x0000C5B8 File Offset: 0x0000A7B8
		[LineNumberTable(new byte[] { 162, 169, 99, 98, 159, 23, 98, 111, 130 })]
		[MethodImpl(8)]
		private bool conditionCH0(string A_1, int A_2)
		{
			return A_2 == 0 && (DoubleMetaphone.contains(A_1, A_2 + 1, 5, "HARAC", "HARIS") || DoubleMetaphone.contains(A_1, A_2 + 1, 3, "HOR", "HYM", "HIA", "HEM")) && !DoubleMetaphone.contains(A_1, 0, 5, "CHORE");
		}

		// Token: 0x060001E3 RID: 483 RVA: 0x0000C614 File Offset: 0x0000A814
		[LineNumberTable(811)]
		[MethodImpl(8)]
		private bool conditionCH1(string A_1, int A_2)
		{
			return DoubleMetaphone.contains(A_1, 0, 4, "VAN ", "VON ") || DoubleMetaphone.contains(A_1, 0, 3, "SCH") || DoubleMetaphone.contains(A_1, A_2 - 2, 6, "ORCHES", "ARCHIT", "ORCHID") || DoubleMetaphone.contains(A_1, A_2 + 2, 1, "T", "S") || ((DoubleMetaphone.contains(A_1, A_2 - 1, 1, "A", "O", "U", "E") || A_2 == 0) && (DoubleMetaphone.contains(A_1, A_2 + 2, 1, DoubleMetaphone.L_R_N_M_B_H_F_V_W_SPACE) || A_2 + 1 == String.instancehelper_length(A_1) - 1));
		}

		// Token: 0x060001E4 RID: 484 RVA: 0x0000C6C0 File Offset: 0x0000A8C0
		[LineNumberTable(new byte[]
		{
			161, 95, 118, 104, 106, 99, 110, 138, 136, 106,
			223, 57, 135, 191, 24, 106, 114, 136, 133
		})]
		[MethodImpl(8)]
		private int handleGH(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (A_3 > 0 && !this.isVowel(this.charAt(A_1, A_3 - 1)))
			{
				A_2.append('K');
				A_3 += 2;
			}
			else if (A_3 == 0)
			{
				if (this.charAt(A_1, A_3 + 2) == 'I')
				{
					A_2.append('J');
				}
				else
				{
					A_2.append('K');
				}
				A_3 += 2;
			}
			else if ((A_3 > 1 && DoubleMetaphone.contains(A_1, A_3 - 2, 1, "B", "H", "D")) || (A_3 > 2 && DoubleMetaphone.contains(A_1, A_3 - 3, 1, "B", "H", "D")) || (A_3 > 3 && DoubleMetaphone.contains(A_1, A_3 - 4, 1, "B", "H")))
			{
				A_3 += 2;
			}
			else
			{
				if (A_3 > 2 && this.charAt(A_1, A_3 - 1) == 'U' && DoubleMetaphone.contains(A_1, A_3 - 3, 1, "C", "G", "L", "R", "T"))
				{
					A_2.append('F');
				}
				else if (A_3 > 0 && this.charAt(A_1, A_3 - 1) != 'I')
				{
					A_2.append('K');
				}
				A_3 += 2;
			}
			return A_3;
		}

		// Token: 0x060001E5 RID: 485 RVA: 0x0000C7E4 File Offset: 0x0000A9E4
		[LineNumberTable(860)]
		[MethodImpl(8)]
		private bool isVowel(char A_1)
		{
			return String.instancehelper_indexOf("AEIOUY", (int)A_1) != -1;
		}

		// Token: 0x060001E6 RID: 486 RVA: 0x0000C804 File Offset: 0x0000AA04
		[LineNumberTable(new byte[]
		{
			163, 86, 98, 111, 139, 115, 106, 98, 226, 61,
			232, 71
		})]
		[MethodImpl(8)]
		protected internal static bool contains(string value, int start, int length, string[] criteria)
		{
			int num = 0;
			if (start >= 0 && start + length <= String.instancehelper_length(value))
			{
				string text = String.instancehelper_substring(value, start, start + length);
				int num2 = criteria.Length;
				for (int i = 0; i < num2; i++)
				{
					string text2 = criteria[i];
					if (String.instancehelper_equals(text, text2))
					{
						num = 1;
						break;
					}
				}
			}
			return num != 0;
		}

		// Token: 0x060001E7 RID: 487 RVA: 0x0000C857 File Offset: 0x0000AA57
		[LineNumberTable(945)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3, string A_4, string A_5, string A_6, string A_7)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3, A_4, A_5, A_6, A_7 });
		}

		// Token: 0x060001E8 RID: 488 RVA: 0x0000C884 File Offset: 0x0000AA84
		[LineNumberTable(new byte[] { 162, 196, 159, 7, 98, 191, 40, 130 })]
		[MethodImpl(8)]
		private bool conditionL0(string A_1, int A_2)
		{
			return (A_2 == String.instancehelper_length(A_1) - 3 && DoubleMetaphone.contains(A_1, A_2 - 1, 4, "ILLO", "ILLA", "ALLE")) || ((DoubleMetaphone.contains(A_1, String.instancehelper_length(A_1) - 2, 2, "AS", "OS") || DoubleMetaphone.contains(A_1, String.instancehelper_length(A_1) - 1, 1, "A", "O")) && DoubleMetaphone.contains(A_1, A_2 - 1, 4, "ALLE"));
		}

		// Token: 0x060001E9 RID: 489 RVA: 0x0000C903 File Offset: 0x0000AB03
		[LineNumberTable(934)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3, string A_4, string A_5, string A_6)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3, A_4, A_5, A_6 });
		}

		// Token: 0x060001EA RID: 490 RVA: 0x0000C928 File Offset: 0x0000AB28
		[LineNumberTable(new byte[]
		{
			162, 17, 145, 159, 11, 150, 149, 173, 127, 0,
			140, 170, 123, 138, 139
		})]
		[MethodImpl(8)]
		private int handleSC(string A_1, DoubleMetaphone.DoubleMetaphoneResult A_2, int A_3)
		{
			if (this.charAt(A_1, A_3 + 2) == 'H')
			{
				if (DoubleMetaphone.contains(A_1, A_3 + 3, 2, "OO", "ER", "EN", "UY", "ED", "EM"))
				{
					if (DoubleMetaphone.contains(A_1, A_3 + 3, 2, "ER", "EN"))
					{
						A_2.append("X", "SK");
					}
					else
					{
						A_2.append("SK");
					}
				}
				else if (A_3 == 0 && !this.isVowel(this.charAt(A_1, 3)) && this.charAt(A_1, 3) != 'W')
				{
					A_2.append('X', 'S');
				}
				else
				{
					A_2.append('X');
				}
			}
			else if (DoubleMetaphone.contains(A_1, A_3 + 2, 1, "I", "E", "Y"))
			{
				A_2.append('S');
			}
			else
			{
				A_2.append("SK");
			}
			return A_3 + 3;
		}

		// Token: 0x060001EB RID: 491 RVA: 0x0000CA10 File Offset: 0x0000AC10
		[LineNumberTable(957)]
		[MethodImpl(8)]
		private static bool contains(string A_0, int A_1, int A_2, string A_3, string A_4, string A_5, string A_6, string A_7, string A_8)
		{
			return DoubleMetaphone.contains(A_0, A_1, A_2, new string[] { A_3, A_4, A_5, A_6, A_7, A_8 });
		}

		// Token: 0x060001EC RID: 492 RVA: 0x0000CA40 File Offset: 0x0000AC40
		[LineNumberTable(new byte[] { 15, 232, 58, 231, 71 })]
		[MethodImpl(8)]
		public DoubleMetaphone()
		{
			this.maxCodeLen = 4;
		}

		// Token: 0x060001ED RID: 493 RVA: 0x0000CA5C File Offset: 0x0000AC5C
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 160, 88, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object obj)
		{
			if (!(obj is string))
			{
				string text = "DoubleMetaphone encode parameter is not of type String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.doubleMetaphone((string)obj);
		}

		// Token: 0x060001EE RID: 494 RVA: 0x0000CA84 File Offset: 0x0000AC84
		[LineNumberTable(216)]
		[MethodImpl(8)]
		public virtual string encode(string value)
		{
			return this.doubleMetaphone(value);
		}

		// Token: 0x060001EF RID: 495 RVA: 0x0000CA8F File Offset: 0x0000AC8F
		[LineNumberTable(230)]
		[MethodImpl(8)]
		public virtual bool isDoubleMetaphoneEqual(string value1, string value2)
		{
			return this.isDoubleMetaphoneEqual(value1, value2, false);
		}

		// Token: 0x060001F0 RID: 496 RVA: 0x0000CA9C File Offset: 0x0000AC9C
		public virtual void setMaxCodeLen(int maxCodeLen)
		{
			this.maxCodeLen = maxCodeLen;
		}

		// Token: 0x040000AF RID: 175
		private const string VOWELS = "AEIOUY";

		// Token: 0x040000B0 RID: 176
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static string[] SILENT_START = new string[] { "GN", "KN", "PN", "WR", "PS" };

		// Token: 0x040000B1 RID: 177
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static string[] L_R_N_M_B_H_F_V_W_SPACE = new string[] { "L", "R", "N", "M", "B", "H", "F", "V", "W", " " };

		// Token: 0x040000B2 RID: 178
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static string[] ES_EP_EB_EL_EY_IB_IL_IN_IE_EI_ER = new string[]
		{
			"ES", "EP", "EB", "EL", "EY", "IB", "IL", "IN", "IE", "EI",
			"ER"
		};

		// Token: 0x040000B3 RID: 179
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static string[] L_T_K_S_N_M_B_Z = new string[] { "L", "T", "K", "S", "N", "M", "B", "Z" };

		// Token: 0x040000B4 RID: 180
		private int maxCodeLen;

		// Token: 0x02000031 RID: 49
		[InnerClass(null, Modifiers.Public)]
		[SourceFile("DoubleMetaphone.java")]
		public class DoubleMetaphoneResult : Object
		{
			// Token: 0x060001F2 RID: 498 RVA: 0x0000B0DC File Offset: 0x000092DC
			[LineNumberTable(new byte[] { 158, 146, 66, 115, 141 })]
			[MethodImpl(8)]
			public virtual void appendPrimary(char value)
			{
				if (this.primary.length() < this.maxLength)
				{
					this.primary.append(value);
				}
			}

			// Token: 0x060001F3 RID: 499 RVA: 0x0000B10C File Offset: 0x0000930C
			[LineNumberTable(new byte[] { 158, 145, 130, 115, 141 })]
			[MethodImpl(8)]
			public virtual void appendAlternate(char value)
			{
				if (this.alternate.length() < this.maxLength)
				{
					this.alternate.append(value);
				}
			}

			// Token: 0x060001F4 RID: 500 RVA: 0x0000B13C File Offset: 0x0000933C
			[LineNumberTable(new byte[] { 163, 148, 115, 105, 143, 148 })]
			[MethodImpl(8)]
			public virtual void appendPrimary(string value)
			{
				int num = this.maxLength - this.primary.length();
				if (String.instancehelper_length(value) <= num)
				{
					this.primary.append(value);
				}
				else
				{
					this.primary.append(String.instancehelper_substring(value, 0, num));
				}
			}

			// Token: 0x060001F5 RID: 501 RVA: 0x0000B188 File Offset: 0x00009388
			[LineNumberTable(new byte[] { 163, 157, 115, 105, 143, 148 })]
			[MethodImpl(8)]
			public virtual void appendAlternate(string value)
			{
				int num = this.maxLength - this.alternate.length();
				if (String.instancehelper_length(value) <= num)
				{
					this.alternate.append(value);
				}
				else
				{
					this.alternate.append(String.instancehelper_substring(value, 0, num));
				}
			}

			// Token: 0x060001F6 RID: 502 RVA: 0x0000B1D4 File Offset: 0x000093D4
			[LineNumberTable(new byte[] { 163, 111, 239, 60, 118, 214, 103 })]
			[MethodImpl(8)]
			public DoubleMetaphoneResult(DoubleMetaphone dm, int maxLength)
			{
				this.primary = new StringBuilder(this.this$0.getMaxCodeLen());
				this.alternate = new StringBuilder(this.this$0.getMaxCodeLen());
				this.maxLength = maxLength;
			}

			// Token: 0x060001F7 RID: 503 RVA: 0x0000B224 File Offset: 0x00009424
			[LineNumberTable(new byte[] { 158, 149, 130, 103, 105 })]
			[MethodImpl(8)]
			public virtual void append(char value)
			{
				this.appendPrimary(value);
				this.appendAlternate(value);
			}

			// Token: 0x060001F8 RID: 504 RVA: 0x0000B244 File Offset: 0x00009444
			[LineNumberTable(new byte[] { 158, 148, 164, 103, 105 })]
			[MethodImpl(8)]
			public virtual void append(char primary, char alternate)
			{
				this.appendPrimary(primary);
				this.appendAlternate(alternate);
			}

			// Token: 0x060001F9 RID: 505 RVA: 0x0000B265 File Offset: 0x00009465
			[LineNumberTable(new byte[] { 163, 138, 103, 105 })]
			[MethodImpl(8)]
			public virtual void append(string value)
			{
				this.appendPrimary(value);
				this.appendAlternate(value);
			}

			// Token: 0x060001FA RID: 506 RVA: 0x0000B277 File Offset: 0x00009477
			[LineNumberTable(new byte[] { 163, 143, 103, 105 })]
			[MethodImpl(8)]
			public virtual void append(string primary, string alternate)
			{
				this.appendPrimary(primary);
				this.appendAlternate(alternate);
			}

			// Token: 0x060001FB RID: 507 RVA: 0x0000B289 File Offset: 0x00009489
			[LineNumberTable(1048)]
			[MethodImpl(8)]
			public virtual string getPrimary()
			{
				return this.primary.toString();
			}

			// Token: 0x060001FC RID: 508 RVA: 0x0000B298 File Offset: 0x00009498
			[LineNumberTable(1052)]
			[MethodImpl(8)]
			public virtual string getAlternate()
			{
				return this.alternate.toString();
			}

			// Token: 0x060001FD RID: 509 RVA: 0x0000B2A7 File Offset: 0x000094A7
			[LineNumberTable(1056)]
			[MethodImpl(8)]
			public virtual bool isComplete()
			{
				return this.primary.length() >= this.maxLength && this.alternate.length() >= this.maxLength;
			}

			// Token: 0x040000B5 RID: 181
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private StringBuilder primary;

			// Token: 0x040000B6 RID: 182
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private StringBuilder alternate;

			// Token: 0x040000B7 RID: 183
			[Modifiers(Modifiers.Private | Modifiers.Final)]
			private int maxLength;

			// Token: 0x040000B8 RID: 184
			[Modifiers(Modifiers.Final | Modifiers.Synthetic)]
			internal DoubleMetaphone this$0 = dm;
		}
	}
}
