using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.language.bm
{
	// Token: 0x02000037 RID: 55
	[Implements(new string[] { "com.edc.classbook.util.codec.StringEncoder" })]
	public class BeiderMorseEncoder : Object, StringEncoder, Encoder
	{
		// Token: 0x06000232 RID: 562 RVA: 0x0000DD38 File Offset: 0x0000BF38
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 38, 99, 130 })]
		[MethodImpl(8)]
		public virtual string encode(string source)
		{
			if (source == null)
			{
				return null;
			}
			return this.engine.encode(source);
		}

		// Token: 0x06000233 RID: 563 RVA: 0x0000DD50 File Offset: 0x0000BF50
		[LineNumberTable(new byte[] { 21, 232, 69 })]
		[MethodImpl(8)]
		public BeiderMorseEncoder()
		{
			PhoneticEngine.__<clinit>();
			this.engine = new PhoneticEngine(NameType.__<>GENERIC, RuleType.__<>APPROX, true);
		}

		// Token: 0x06000234 RID: 564 RVA: 0x0000DD80 File Offset: 0x0000BF80
		[Throws(new string[] { "com.edc.classbook.util.codec.EncoderException" })]
		[LineNumberTable(new byte[] { 30, 104, 144 })]
		[MethodImpl(8)]
		public virtual object encode(object source)
		{
			if (!(source is string))
			{
				string text = "BeiderMorseEncoder encode parameter is not of type String";
				Throwable.__<suppressFillInStackTrace>();
				throw new EncoderException(text);
			}
			return this.encode((string)source);
		}

		// Token: 0x06000235 RID: 565 RVA: 0x0000DDA8 File Offset: 0x0000BFA8
		[LineNumberTable(100)]
		[MethodImpl(8)]
		public virtual NameType getNameType()
		{
			return this.engine.getNameType();
		}

		// Token: 0x06000236 RID: 566 RVA: 0x0000DDB7 File Offset: 0x0000BFB7
		[LineNumberTable(109)]
		[MethodImpl(8)]
		public virtual RuleType getRuleType()
		{
			return this.engine.getRuleType();
		}

		// Token: 0x06000237 RID: 567 RVA: 0x0000DDC6 File Offset: 0x0000BFC6
		[LineNumberTable(118)]
		[MethodImpl(8)]
		public virtual bool isConcat()
		{
			return this.engine.isConcat();
		}

		// Token: 0x06000238 RID: 568 RVA: 0x0000DDD8 File Offset: 0x0000BFD8
		[LineNumberTable(new byte[] { 159, 110, 98, 223, 19 })]
		[MethodImpl(8)]
		public virtual void setConcat(bool concat)
		{
			PhoneticEngine.__<clinit>();
			this.engine = new PhoneticEngine(this.engine.getNameType(), this.engine.getRuleType(), concat, this.engine.getMaxPhonemes());
		}

		// Token: 0x06000239 RID: 569 RVA: 0x0000DE19 File Offset: 0x0000C019
		[LineNumberTable(new byte[] { 93, 223, 19 })]
		[MethodImpl(8)]
		public virtual void setNameType(NameType nameType)
		{
			PhoneticEngine.__<clinit>();
			this.engine = new PhoneticEngine(nameType, this.engine.getRuleType(), this.engine.isConcat(), this.engine.getMaxPhonemes());
		}

		// Token: 0x0600023A RID: 570 RVA: 0x0000DE4D File Offset: 0x0000C04D
		[LineNumberTable(new byte[] { 106, 223, 19 })]
		[MethodImpl(8)]
		public virtual void setRuleType(RuleType ruleType)
		{
			PhoneticEngine.__<clinit>();
			this.engine = new PhoneticEngine(this.engine.getNameType(), ruleType, this.engine.isConcat(), this.engine.getMaxPhonemes());
		}

		// Token: 0x0600023B RID: 571 RVA: 0x0000DE81 File Offset: 0x0000C081
		[LineNumberTable(new byte[] { 120, 223, 19 })]
		[MethodImpl(8)]
		public virtual void setMaxPhonemes(int maxPhonemes)
		{
			PhoneticEngine.__<clinit>();
			this.engine = new PhoneticEngine(this.engine.getNameType(), this.engine.getRuleType(), this.engine.isConcat(), maxPhonemes);
		}

		// Token: 0x040000D9 RID: 217
		private PhoneticEngine engine;
	}
}
