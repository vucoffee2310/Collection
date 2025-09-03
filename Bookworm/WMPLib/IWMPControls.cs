using System;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace WMPLib
{
	// Token: 0x0200004C RID: 76
	[CompilerGenerated]
	[Guid("74C09E02-F828-11D2-A74B-00A0C905F36E")]
	[TypeIdentifier]
	[ComImport]
	public interface IWMPControls
	{
		// Token: 0x06000591 RID: 1425
		void _VtblGap1_1();

		// Token: 0x06000592 RID: 1426
		[DispId(51)]
		[MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
		void play();

		// Token: 0x06000593 RID: 1427
		void _VtblGap2_4();

		// Token: 0x17000104 RID: 260
		// (get) Token: 0x06000594 RID: 1428
		// (set) Token: 0x06000595 RID: 1429
		[DispId(56)]
		double currentPosition
		{
			[DispId(56)]
			[MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
			get;
			[DispId(56)]
			[MethodImpl(MethodImplOptions.InternalCall, MethodCodeType = MethodCodeType.Runtime)]
			[param: In]
			set;
		}
	}
}
